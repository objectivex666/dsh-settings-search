import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const hook = '    exports.apply = apply'
assert.equal(source.split(hook).length, 2)
// Expose closure helpers only in the VM; the shipped module has no test exports.
const instrumented = source.replace(hook, `
    Object.assign(exports, {
      aiConfig, setAiConfig, aiConfigReady, ollamaChatUrl,
      requestUserAi, requestAiKeywords, testAiService, LOGS,
      modelsUrl, fetchAiModels,
      readIndexCache, serializeHarvest,
    })
${hook}`)
const storage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}
const json = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
})
const plain = (value) => JSON.parse(JSON.stringify(value))
const ollama = { provider: 'ollama', baseUrl: '', model: 'local-model:7b', apiKey: '' }
const openai = { provider: 'openai', baseUrl: 'https://example.test/v1', model: 'cloud-model', apiKey: 'test-secret' }
const anthropic = { ...openai, provider: 'anthropic', baseUrl: 'https://example.test' }
const modelHook = '      const model = createModel(ctx)'

const reply = (provider, content = '{"keywords":["Language"]}') => provider === 'ollama'
  ? { message: { role: 'assistant', content }, done: true }
  : provider === 'anthropic'
    ? { content: [{ type: 'text', text: content }] }
    : { choices: [{ message: { role: 'assistant', content } }] }

function load(fetchImpl = async () => json(reply('ollama'))) {
  let handoff
  const calls = []
  const sandbox = {
    window: { __ModuleLoader__: { load: (value) => { handoff = value } }, dispatchEvent() {} },
    localStorage: storage(),
    sessionStorage: storage(),
    CustomEvent: class { constructor(type) { this.type = type } },
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async (url, options) => {
      const call = { url, ...options, body: options.body ? JSON.parse(options.body) : undefined }
      calls.push(call)
      return fetchImpl(call)
    },
  }
  const instrumentedModel = instrumented.replace(modelHook, modelHook + '\n    exports.__indexTestModel = model')
  vm.runInNewContext(instrumentedModel, sandbox, { filename: 'lib/client.js' })
  const api = handoff.factory(() => ({ createElement: () => null }))
  return { api, calls, sandbox }
}

test('persistent settings index reuses matching fingerprints and drops invalid rows', () => {
  const { api, sandbox } = load()
  const records = {
    'settings.general.item': {
      row1: { title: 'Enable Workshop card', idx: 1, text: 'Enable Workshop card and save.', inner: [] },
      broken: { idx: 2 },
    },
  }
  assert.equal(Object.keys(api.serializeHarvest(new Map())).length, 0)
  sandbox.localStorage.setItem('dsh-settings-search:index:v1', JSON.stringify({
    version: 1,
    fingerprint: 'manager:test',
    updatedAt: 1,
    harvest: records,
  }))
  const cached = api.readIndexCache()
  assert.equal(cached.fingerprint, 'manager:test')
  assert.equal(cached.harvest.get('settings.general.item')?.get('row1')?.title, 'Enable Workshop card')
  assert.equal(cached.harvest.get('settings.general.item')?.has('broken'), false)

  const ctx = {
    effect: (fn) => fn(),
    get: () => null,
    inject: () => {},
    locale: {
      register: () => {},
      bind: () => () => '',
      subscribe: () => () => {},
    },
    slots: {
      register: (name, id, options) => ({ name, id, options }),
      inject: (_slot, registrar) => registrar(),
      entries: (slot) => slot === 'settings.general.item'
        ? [{ options: { id: 'row1', order: 1 } }]
        : [],
      subscribe: () => () => {},
    },
  }
  api.apply(ctx)
  const model = api.__indexTestModel
  assert.equal(model.indexFingerprintReady(), true)
  assert.equal(model.applyIndexFingerprint('manager:test'), false)
  assert.ok(model.readDeep().some((item) => item.label === 'Enable Workshop card'))
  assert.equal(model.applyIndexFingerprint('manager:changed'), true)
  assert.equal(model.readDeep().some((item) => item.label === 'Enable Workshop card'), false)
  assert.equal(model.persistIndex('manager:changed'), false)
})

test('readIndexCache rejects malformed persisted index payloads', () => {
  const { api, sandbox } = load()
  for (const value of ['{', '{"version":1}', 'null']) {
    sandbox.localStorage.setItem('dsh-settings-search:index:v1', value)
    assert.equal(api.readIndexCache(), null)
  }
})

test('Ollama configuration persists and requires a model but no key', () => {
  const { api, sandbox } = load()
  api.setAiConfig({ ...ollama, model: ' local-model:7b ' })
  assert.deepEqual(plain(api.aiConfig()), { ...ollama, baseUrl: 'http://127.0.0.1:11434' })
  assert.equal(api.aiConfigReady(api.aiConfig()), true)
  assert.equal(api.aiConfigReady({ ...ollama, model: ' ' }), false)
  assert.equal(sandbox.localStorage.getItem('dsh-settings-search:ai-provider'), 'ollama')
  assert.equal(sandbox.sessionStorage.getItem('dsh-settings-search:ai-api-key'), null)
})

test('legacy providers still require keys and unknown provider falls back to OpenAI', () => {
  const { api } = load()
  for (const cfg of [openai, anthropic]) {
    assert.equal(api.aiConfigReady(cfg), true)
    assert.equal(api.aiConfigReady({ ...cfg, apiKey: ' ' }), false)
  }
  api.setAiConfig({ ...openai, provider: 'unknown' })
  assert.equal(api.aiConfig().provider, 'openai')
})

test('Ollama accepts root, native, compatibility, proxy and IPv6 base URLs', () => {
  const { api } = load()
  for (const suffix of ['', '/', '/api', '/api/', '/api/chat', '/api/chat/', '/v1', '/v1/chat/completions']) {
    assert.equal(api.ollamaChatUrl(`http://localhost:11434${suffix}`), 'http://localhost:11434/api/chat')
  }
  assert.equal(api.ollamaChatUrl('http://[::1]:11434/'), 'http://[::1]:11434/api/chat')
  assert.equal(api.ollamaChatUrl('https://example.test/ollama/v1/'), 'https://example.test/ollama/api/chat')
})

test('users discover selectable models from each supported API type', async () => {
  const cases = [
    {
      cfg: ollama,
      payload: { models: [{ name: 'qwen3:8b' }, { name: 'llama3.1:8b' }, { name: 'qwen3:8b' }] },
      url: 'http://127.0.0.1:11434/api/tags',
      headers: {},
      models: ['qwen3:8b', 'llama3.1:8b'],
    },
    {
      cfg: openai,
      payload: { data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4.1-mini' }] },
      url: 'https://example.test/v1/models',
      headers: { authorization: `Bearer ${openai.apiKey}` },
      models: ['gpt-4o-mini', 'gpt-4.1-mini'],
    },
    {
      cfg: anthropic,
      payload: { data: [{ id: 'claude-sonnet-4-20250514' }] },
      url: 'https://example.test/v1/models',
      headers: {
        'x-api-key': anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      models: ['claude-sonnet-4-20250514'],
    },
  ]
  for (const expected of cases) {
    const { api, calls } = load(async () => json(expected.payload))
    assert.deepEqual(plain(await api.fetchAiModels(expected.cfg)), { ok: true, models: expected.models, code: 'ok', detail: '' })
    const [call] = calls
    assert.equal(call.url, expected.url)
    assert.equal(call.method, 'GET')
    assert.equal(call.redirect, 'error')
    assert.deepEqual(plain(call.headers), expected.headers)
  }
})

test('model discovery rejects unsafe or incomplete sources before fetching', async () => {
  const { api, calls } = load(async () => json({ data: [{ id: 'should-not-load' }] }))
  assert.equal(api.modelsUrl('ollama', 'javascript:alert(1)'), '')
  assert.deepEqual(plain(await api.fetchAiModels({ ...ollama, baseUrl: 'file:///models' })), { ok: false, code: 'unsafe-url', models: [], detail: '' })
  assert.deepEqual(plain(await api.fetchAiModels({ ...openai, apiKey: '' })), { ok: false, code: 'need-config', models: [], detail: '' })
  assert.equal(calls.length, 0)
})

test('model discovery reports provider failures without inventing choices', async () => {
  const { api, calls } = load(async () => json({ error: 'denied' }, 401))
  assert.deepEqual(plain(await api.fetchAiModels(ollama)), { ok: false, code: 'auth', models: [], detail: 'HTTP 401' })
  assert.equal(calls.length, 1)
})

test('Ollama search uses native non-streaming JSON and never sends a stored cloud key', async () => {
  const { api, calls, sandbox } = load(async () => json(reply('ollama', '{"keywords":["Language","Language"," Theme ",42]}')))
  api.setAiConfig({ ...ollama, apiKey: 'test-secret' })
  const keywords = await api.requestUserAi('unmatched intent', 'Language\nTheme')
  assert.deepEqual(plain(keywords), ['Language', 'Theme'])
  const [call] = calls
  assert.equal(call.url, 'http://127.0.0.1:11434/api/chat')
  assert.equal(call.method, 'POST')
  assert.equal(call.redirect, 'error')
  assert.deepEqual(plain(call.headers), { 'content-type': 'application/json' })
  assert.equal(call.body.model, ollama.model)
  assert.equal(call.body.stream, false)
  assert.equal(call.body.format, 'json')
  assert.equal(call.body.options.temperature, 0)
  assert.equal(call.body.options.num_predict, 1024)
  assert.equal(call.body.messages[0].role, 'system')
  assert.match(call.body.messages[1].content, /unmatched intent/)
  assert.match(call.body.messages[1].content, /Language\nTheme/)
  assert.equal(JSON.stringify(call.body).includes('test-secret'), false)
  assert.equal(JSON.stringify(api.LOGS).includes('test-secret'), false)
  assert.equal(sandbox.localStorage.getItem('dsh-settings-search:ai-api-key'), null)
})

test('Ollama connectivity test works without an API key and limits generation', async () => {
  const { api, calls } = load()
  assert.deepEqual(plain(await api.testAiService(ollama)), { ok: true })
  assert.deepEqual(plain(calls[0].body), {
    model: ollama.model,
    messages: [{ role: 'user', content: 'ping' }],
    stream: false,
    options: { temperature: 0, num_predict: 1 },
  })
  assert.equal(calls[0].headers.authorization, undefined)
})

for (const cfg of [openai, anthropic]) {
  test(`${cfg.provider} search and test preserve protocol, authentication and redirect protection`, async () => {
    const { api, calls } = load(async () => json(reply(cfg.provider)))
    api.setAiConfig(cfg)
    assert.deepEqual(plain(await api.requestUserAi('intent', 'Language')), ['Language'])
    assert.deepEqual(plain(await api.testAiService(cfg)), { ok: true })
    for (const call of calls) {
      assert.equal(call.redirect, 'error')
      assert.equal(call.body.model, cfg.model)
      assert.equal(call.body.stream, undefined)
      assert.equal(call.body.options, undefined)
      if (cfg.provider === 'anthropic') {
        assert.equal(call.url, 'https://example.test/v1/messages')
        assert.equal(call.headers['x-api-key'], cfg.apiKey)
        assert.equal(call.headers['anthropic-version'], '2023-06-01')
        assert.equal(call.headers['anthropic-dangerous-direct-browser-access'], 'true')
        assert.equal(call.headers.authorization, undefined)
      } else {
        assert.equal(call.url, 'https://example.test/v1/chat/completions')
        assert.equal(call.headers.authorization, `Bearer ${cfg.apiKey}`)
      }
    }
    assert.equal(calls[1].body.max_tokens, 1)
    assert.equal(calls[1].body.messages.length, 1)
    if (cfg.provider === 'anthropic') assert.equal(typeof calls[0].body.system, 'string')
    else assert.equal(calls[0].body.messages[0].role, 'system')
  })
}

test('incomplete configuration never sends requests', async () => {
  const { api, calls } = load()
  for (const cfg of [{ ...ollama, model: '' }, { ...openai, apiKey: '' }, { ...anthropic, apiKey: '' }]) {
    api.setAiConfig(cfg)
    assert.deepEqual(plain(await api.requestUserAi('intent', 'Language')), [])
    assert.equal((await api.testAiService(cfg)).code, 'need-config')
  }
  assert.equal(calls.length, 0)
})

test('unsafe URLs are rejected before search and connectivity requests', async () => {
  const { api, calls } = load()
  for (const baseUrl of ['javascript:alert(1)', 'file:///tmp/model', 'http://example.test', 'https://user:pass@example.test']) {
    const cfg = { ...ollama, baseUrl }
    api.setAiConfig(cfg)
    assert.deepEqual(plain(await api.requestUserAi('intent', 'Language')), [])
    assert.equal((await api.testAiService(cfg)).code, 'unsafe-url')
  }
  assert.equal(calls.length, 0)
})

for (const [status, code] of [[400, 'bad-request'], [401, 'auth'], [403, 'forbidden'], [404, 'not-found'], [429, 'rate-limit'], [500, 'server']]) {
  test(`Ollama HTTP ${status} produces ${code}`, async () => {
    const { api } = load(async () => json({ error: 'test error' }, status))
    assert.equal((await api.testAiService(ollama)).code, code)
    api.setAiConfig(ollama)
    await assert.rejects(api.requestUserAi('intent', 'Language'), { message: `HTTP ${status}` })
  })
}

test('malformed responses and native error payloads cannot pass connectivity checks', async () => {
  for (const data of [null, {}, { message: {} }, { message: { content: 123 } }, { error: 'bad model', ...reply('ollama') }]) {
    const { api } = load(async () => json(data))
    assert.equal((await api.testAiService(ollama)).code, 'bad-response')
  }
  const { api } = load(async () => ({ ok: true, json: async () => { throw new SyntaxError('invalid JSON') } }))
  assert.equal((await api.testAiService(ollama)).code, 'bad-response')
})

test('network failure is reported without claiming connection success', async () => {
  const { api } = load(async () => { throw new TypeError('Failed to fetch') })
  assert.equal((await api.testAiService(ollama)).code, 'network')
})

const abortedFetch = ({ signal }) => new Promise((_, reject) => {
  const abort = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
  if (signal.aborted) abort()
  else signal.addEventListener('abort', abort, { once: true })
})

for (const cfg of [ollama, openai, anthropic]) {
  test(`${cfg.provider} timeout aborts the request and uses its provider deadline`, async () => {
    const { api, sandbox, calls } = load(abortedFetch)
    let expire
    let cleared = false
    sandbox.setTimeout = (callback, ms) => {
      assert.equal(ms, cfg.provider === 'ollama' ? 120000 : 12000)
      expire = callback
      return 1
    }
    sandbox.clearTimeout = () => { cleared = true }
    const result = api.testAiService(cfg)
    expire()
    assert.equal((await result).code, 'timeout')
    assert.equal(calls[0].signal.aborted, true)
    assert.equal(cleared, true)
  })
}

test('search and connectivity propagate cancellation, including pre-aborted signals', async () => {
  const { api, calls } = load(abortedFetch)
  api.setAiConfig(ollama)
  const controller = new AbortController()
  const search = api.requestUserAi('intent', 'Language', controller.signal)
  controller.abort()
  await assert.rejects(search, { name: 'AbortError' })
  assert.equal(calls[0].signal.aborted, true)
  assert.equal((await api.testAiService(ollama, controller.signal)).code, 'cancelled')
})

test('a successful request clears its timer and detaches the caller abort listener', async () => {
  const { api, calls, sandbox } = load()
  const cleared = []
  sandbox.setTimeout = () => 7
  sandbox.clearTimeout = (timer) => cleared.push(timer)
  const controller = new AbortController()
  api.setAiConfig(ollama)
  await api.requestUserAi('intent', 'Language', controller.signal)
  controller.abort()
  assert.equal(calls[0].signal.aborted, false)
  assert.deepEqual(cleared, [7])
})

test('cache respects settings labels and is invalidated when provider configuration changes', async () => {
  let provider = 'ollama'
  const { api, calls } = load(async () => json(reply(provider)))
  api.setAiConfig(ollama)
  await api.requestAiKeywords('intent', 'Language')
  await api.requestAiKeywords('intent', 'Language')
  assert.equal(calls.length, 1)
  await api.requestAiKeywords('intent', 'Theme')
  assert.equal(calls.length, 2)
  api.setAiConfig({ ...ollama, model: 'another-model' })
  await api.requestAiKeywords('intent', 'Language')
  assert.equal(calls.length, 3)
  provider = 'openai'
  api.setAiConfig(openai)
  await api.requestAiKeywords('intent', 'Language')
  assert.equal(calls.length, 4)
  assert.equal(calls[3].headers.authorization, `Bearer ${openai.apiKey}`)
})
