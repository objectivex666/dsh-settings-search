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
      readDshModelConfig, otherPluginFingerprint, DEEP_SLOTS,
      log, flushLogs, discardPendingLogs, sessionLogText, logTarget, readLogCount,
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

// --- A tiny synchronous DOM, enough for the in-page harvest (see the DSH classes below) ---

/** Parse one compound selector: an optional tag plus `[attr]`/`[attr="v"]`/`[attr*="v" i]`. */
const parseCompound = (token) => {
  const tag = /^[a-z0-9]+/i.exec(token)?.[0] ?? ''
  const attrs = []
  const re = /\[([a-zA-Z-]+)(?:([*^$]?=)"([^"]*)"(?:\s+(i))?)?\]/g
  let match
  while ((match = re.exec(token)) !== null) {
    attrs.push({ name: match[1], op: match[2], value: match[3], insensitive: match[4] === 'i' })
  }
  return { tag, attrs }
}

const attrOf = (node, name) => (name === 'class' ? node.class : node.attr[name])

const compoundMatches = (node, compound) => {
  if (compound.tag !== '' && node.tag.toLowerCase() !== compound.tag.toLowerCase()) return false
  for (const attr of compound.attrs) {
    const raw = attrOf(node, attr.name)
    if (raw === undefined) return false
    if (attr.op === undefined) continue
    const value = attr.insensitive ? raw.toLowerCase() : raw
    const expected = attr.insensitive ? attr.value.toLowerCase() : attr.value
    if (attr.op === '=' && value !== expected) return false
    if (attr.op === '*=' && !value.includes(expected)) return false
  }
  return true
}

/** Collect descendants matching any compound of a comma-separated selector. */
const matchAll = (root, selector) => {
  const compounds = selector.split(',')
    .map((token) => parseCompound(token.trim()))
    .filter((compound) => compound.tag !== '' || compound.attrs.length > 0)
  const out = []
  const walk = (node) => {
    for (const child of node.children) {
      if (compounds.some((compound) => compoundMatches(child, compound))) out.push(child)
      walk(child)
    }
  }
  walk(root)
  return out
}

/**
 * One element of the fake DOM. `class` follows DSH's CSS-module shape
 * (`RotMhW_groupTitle`), which is what the harvest has to recognise.
 */
const el = (tag, options = {}, children = []) => {
  const node = {
    tag,
    tagName: tag.toUpperCase(),
    class: options.class ?? '',
    attr: options.attr ?? {},
    text: options.text ?? '',
    children: [],
    parentElement: null,
    get className() { return node.class },
    get textContent() { return [node.text, ...node.children.map((child) => child.textContent)].filter(Boolean).join(' ') },
    get childElementCount() { return node.children.length },
    get firstElementChild() { return node.children[0] ?? null },
    getAttribute(name) { return attrOf(node, name) ?? null },
    querySelectorAll(selector) { return matchAll(node, selector) },
    querySelector(selector) { return matchAll(node, selector)[0] ?? null },
  }
  node.children = children.map((child) => {
    child.parentElement = node
    return child
  })
  return node
}

/** A document stub over one tree, with the pieces `installStyles` and `panelRoot` need. */
const fakeDocument = (root) => ({
  head: { appendChild() {} },
  body: root,
  createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
  querySelectorAll: (selector) => matchAll(root, selector),
  querySelector: (selector) => matchAll(root, selector)[0] ?? null,
})

/**
 * The DSH 0.2.1 Plugins settings page as the harvest sees it: a search row plus
 * the 会话插件 / 全局插件 groups, whose titles live in `RotMhW_groupTitle`
 * spans (camelCase, like every DSH CSS-module class).
 */
const pluginsPageDom = () => {
  const titleRow = (title) => el('div', { class: 'RotMhW_groupTitleRow' }, [
    el('button', { class: 'RotMhW_groupToggle', attr: { 'aria-expanded': 'false' } }, [
      el('span', { class: 'RotMhW_groupTitle', text: title }),
    ]),
  ])
  const group = (scope, title, rows = 0) => el('section', { class: 'RotMhW_group', attr: { 'data-plugin-scope': scope } }, [
    titleRow(title),
    el('p', { class: 'RotMhW_groupSub', text: scope === 'preset' ? '由 Agent 预设按会话组成' : '系统与所有会话共用' }),
    el('div', { class: 'RotMhW_pluginList' }, Array.from({ length: rows }, (_, i) =>
      el('button', { class: 'RotMhW_pluginRow' }, [
        el('strong', { class: 'RotMhW_cardTitle', text: `${scope}-plugin-${i}` }),
      ]))),
  ])
  const page = el('div', { class: 'RotMhW_section' }, [
    el('h2', { class: 'RotMhW_heading', text: '插件' }),
    el('div', { class: 'RotMhW_catalog' }, [
      el('label', { class: 'RotMhW_search' }, [
        el('span', { class: 'RotMhW_visuallyHidden', text: '搜索插件' }),
        el('input', { attr: { type: 'search' } }),
      ]),
      // More card titles than the 24-entry cap, so a DOM-order harvest would
      // truncate the second group title before seeing it.
      group('preset', '会话插件', 30),
      group('global', '全局插件'),
    ]),
  ])
  const navButton = el('button', { attr: { 'aria-current': 'true' }, text: '插件' })
  const dialog = el('div', { attr: { role: 'dialog' } }, [
    el('div', { class: 'RotMhW_nav' }, [navButton]),
    el('div', { attr: { 'data-slot': 'settings.section' } }, [page]),
  ])
  return { dialog }
}

/** A ctx whose Plugins page is the active settings section. */
const pluginsPageCtx = () => ({
  effect: (fn) => fn(),
  get: () => null,
  inject: () => {},
  locale: { register: () => {}, bind: () => () => '', subscribe: () => () => {} },
  slots: {
    register: (name, id, options) => ({ name, id, options }),
    inject: (_slot, registrar) => registrar(),
    entries: (slot) => (slot === 'settings.section'
      ? [{ options: { id: 'plugins', order: 15, label: '插件' } }]
      : []),
    subscribe: () => () => {},
  },
})

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
  sandbox.localStorage.setItem('dsh-settings-search:index:v2', JSON.stringify({
    version: 2,
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

test('readIndexCache rejects malformed and legacy persisted index payloads', () => {
  const { api, sandbox } = load()
  const legacy = JSON.stringify({ version: 1, fingerprint: 'manager:old', updatedAt: 1, harvest: {} })
  for (const value of ['{', '{"version":2}', 'null', legacy]) {
    sandbox.localStorage.setItem('dsh-settings-search:index:v2', value)
    assert.equal(api.readIndexCache(), null)
  }
})

test('writing the index uses the current schema and drops the legacy cache key', () => {
  const { api, sandbox } = load()
  const records = { 'settings.general.item': { row1: { title: 'Row', idx: 0, text: '', inner: [] } } }
  sandbox.localStorage.setItem('dsh-settings-search:index:v1', JSON.stringify({ version: 1, fingerprint: 'manager:old', updatedAt: 1, harvest: records }))
  sandbox.localStorage.setItem('dsh-settings-search:index:v2', JSON.stringify({ version: 2, fingerprint: 'manager:test', updatedAt: 1, harvest: records }))
  api.apply({
    effect: (fn) => fn(),
    get: () => null,
    inject: () => {},
    locale: { register: () => {}, bind: () => () => '', subscribe: () => () => {} },
    slots: {
      register: (name, id, options) => ({ name, id, options }),
      inject: (_slot, registrar) => registrar(),
      entries: (slot) => (slot === 'settings.general.item' ? [{ options: { id: 'row1', order: 1 } }] : []),
      subscribe: () => () => {},
    },
  })
  const model = api.__indexTestModel
  assert.equal(model.persistIndex('manager:next'), true)
  assert.equal(sandbox.localStorage.getItem('dsh-settings-search:index:v1'), null)
  const raw = JSON.parse(sandbox.localStorage.getItem('dsh-settings-search:index:v2'))
  assert.equal(raw.version, 2)
  assert.equal(raw.fingerprint, 'manager:next')
})

test('in-page group titles on the Plugins page are harvested and searchable', () => {
  const { api, sandbox } = load()
  sandbox.document = fakeDocument(pluginsPageDom().dialog)
  api.apply(pluginsPageCtx())
  const model = api.__indexTestModel
  // The warm pass visits the active section and mines what it renders; the
  // 会话插件 / 全局插件 groups are plain DOM, not slot registrations.
  model.runHarvest()
  const options = model.readDeep().filter((item) => item.parentLabel === '插件')
  const labels = options.map((item) => item.label)
  assert.ok(labels.includes('会话插件'), `会话插件 missing from ${JSON.stringify(labels)}`)
  assert.ok(labels.includes('全局插件'), `全局插件 missing from ${JSON.stringify(labels)}`)
  for (const label of ['会话插件', '全局插件']) {
    const option = options.find((item) => item.label === label)
    assert.equal(option.kind, 'option')
    assert.equal(option.pageLabel, '插件')
    assert.equal(option.slot, 'settings.section')
  }
  // The page's own filter box is not a setting: its label text must not become
  // an in-page option (the Plugins tab renders one).
  assert.ok(!labels.includes('搜索插件'), `the page filter leaked into the index: ${JSON.stringify(labels)}`)
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
    const deadline = cfg.provider === 'ollama' ? 120000 : 12000
    const delays = []
    sandbox.setTimeout = (callback, ms) => {
      delays.push(ms)
      // The log batch timer shares this seam, so select the request deadline.
      if (ms === deadline) expire = callback
      return 1
    }
    sandbox.clearTimeout = () => { cleared = true }
    const result = api.testAiService(cfg)
    assert.ok(delays.includes(deadline), `the request must use a ${deadline}ms deadline, saw ${delays.join('/')}`)
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

// --- DSH default-model import: 0.2 Remote namespaces, the legacy unary client, and failures ---

const dshNamespaces = (provider, model, providerProfiles) => ([
  { ns: 'agent-default-model', value: { provider, model, reasoningEffort: 'high' } },
  { ns: 'llm-pi-ai', value: { providers: providerProfiles } },
])
const describeReply = (namespaces) => ({ ok: true, value: { writable: true, hasDocument: true, namespaces } })

test('DSH 0.2 remote namespaces supply the default model config without touching credentials', async () => {
  const { api } = load()
  const requested = []
  const ctx = {
    get: (name) => {
      requested.push(name)
      if (name === 'remote.settings') {
        return {
          describe: async () => describeReply(dshNamespaces('openai', 'gpt-x', {
            openai: { api: 'openai-completions', baseURL: 'https://example.test/v1', models: [{ id: 'gpt-x' }] },
          })),
        }
      }
      if (name === 'remote.llm') {
        return {
          listConfigurableProviders: async () => ({
            ok: true,
            value: [{ provider: 'openai', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai'] }],
          }),
        }
      }
      return undefined
    },
  }
  assert.deepEqual(plain(await api.readDshModelConfig(ctx, (key) => key)), {
    provider: 'openai',
    baseUrl: 'https://example.test/v1',
    model: 'gpt-x',
  })
  assert.deepEqual(requested, ['remote.settings', 'remote.llm'])
})

test('the legacy connection.api unary client still supplies the default model config', async () => {
  const { api } = load()
  const ctx = {
    get: (name) => name === 'connection'
      ? {
          api: {
            settings: {
              describe: async (payload) => {
                assert.deepEqual(plain(payload), {})
                return {
                  result: {
                    ok: true,
                    value: {
                      namespaces: dshNamespaces('anthropic', 'claude-x', {
                        anthropic: { baseURL: 'https://anthropic.test', models: [{ id: 'claude-x', api: 'anthropic-messages' }] },
                      }),
                    },
                  },
                }
              },
            },
            llm: {
              providers: async () => ({
                result: {
                  ok: true,
                  value: { providers: [{ provider: 'anthropic', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'anthropic'] }] },
                },
              }),
            },
          },
        }
      : undefined,
  }
  assert.deepEqual(plain(await api.readDshModelConfig(ctx, (key) => key)), {
    provider: 'anthropic',
    baseUrl: 'https://anthropic.test',
    model: 'claude-x',
  })
})

test('a missing llm namespace falls back to the provider profile inside the settings namespace', async () => {
  const { api } = load()
  const ctx = {
    get: (name) => name === 'remote.settings'
      ? {
          describe: async () => describeReply(dshNamespaces('ollama', 'qwen3:8b', {
            ollama: { baseURL: 'http://127.0.0.1:11434/v1', models: [{ id: 'qwen3:8b' }] },
          })),
        }
      : undefined,
  }
  assert.deepEqual(plain(await api.readDshModelConfig(ctx, (key) => key)), {
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen3:8b',
  })
})

test('a failed describe is reported instead of being mistaken for a missing model', async () => {
  const { api } = load()
  const ctx = {
    get: (name) => name === 'remote.settings'
      ? { describe: async () => ({ ok: false, error: { message: 'settings are read-only' } }) }
      : undefined,
  }
  await assert.rejects(api.readDshModelConfig(ctx, (key) => key), { message: 'settings are read-only' })
})

test('a DSH build with no settings API fails with a readable reason instead of a TypeError', async () => {
  const { api } = load()
  await assert.rejects(api.readDshModelConfig({ get: () => undefined }, (key) => key), { message: 'aiDshImportApi' })
})

// --- DSH default-model import: the built-in DeepSeek route ---

/** A ctx whose default model is one route, with whatever namespaces it reads. */
const dshDefaultModel = (provider, model, { settingsNs, namespaces = [] } = {}) => ({
  get: (name) => name === 'remote.settings'
    ? {
        describe: async () => describeReply([
          { ns: 'agent-default-model', value: { provider, model } },
          ...namespaces,
        ]),
      }
    : name === 'remote.llm'
      ? {
          listConfigurableProviders: async () => ({
            ok: true,
            value: [{ provider, settingsNs, settingsPath: [] }],
          }),
        }
      : undefined,
})

test('a built-in DeepSeek default model imports the adapter\u2019s own endpoint', async () => {
  const { api } = load()
  for (const [provider, settingsNs] of [['deepseek-account', 'llm-deepseek-account'], ['deepseek-official', 'llm-deepseek']]) {
    const ctx = dshDefaultModel(provider, 'deepseek-flash', { settingsNs })
    assert.deepEqual(plain(await api.readDshModelConfig(ctx, (key) => key)), {
      provider: 'anthropic',
      baseUrl: 'https://api.deepseek.com/anthropic',
      model: 'deepseek-flash',
      builtin: true,
    }, `${provider} must fall back to the DeepSeek endpoint`)
  }
})

test('a configured DeepSeek base URL wins over the built-in fallback', async () => {
  const { api } = load()
  const ctx = dshDefaultModel('deepseek-official', 'deepseek-chat', {
    settingsNs: 'llm-deepseek',
    namespaces: [{ ns: 'llm-deepseek', value: { baseURL: 'https://proxy.test/anthropic' } }],
  })
  assert.deepEqual(plain(await api.readDshModelConfig(ctx, (key) => key)), {
    provider: 'anthropic',
    baseUrl: 'https://proxy.test/anthropic',
    model: 'deepseek-chat',
  })
})

test('a third-party route without an importable Base URL still names the model', async () => {
  const { api } = load()
  const ctx = dshDefaultModel('acme-gateway', 'acme-large', {
    settingsNs: 'llm-pi-ai',
    namespaces: [{ ns: 'llm-pi-ai', value: { providers: { 'acme-gateway': { models: [{ id: 'acme-large' }] } } } }],
  })
  await assert.rejects(api.readDshModelConfig(ctx, (key) => key), { message: 'aiDshImportNoBaseUrl' })
})

test('no default model imports nothing', async () => {
  const { api } = load()
  const idle = {
    get: (name) => name === 'remote.settings'
      ? { describe: async () => describeReply([{ ns: 'agent-default-model', value: {} }]) }
      : undefined,
  }
  assert.equal(await api.readDshModelConfig(idle, (key) => key), null)
})

// --- DSH 0.2 adaptation: plugin-inventory fingerprint and in-page seats ---

test('the plugin-inventory fingerprint drops this plugin and follows 0.2 bundle/plugin rows', () => {
  const { api } = load()
  const own = { id: '@objectivex666/dsh-settings-search', npm: '@objectivex666/dsh-settings-search', version: '1.13.0' }
  const shell = { id: '@deepseek-ai/dsh-client-ui-shell', npm: '@deepseek-ai/dsh-client-ui-shell', version: '0.2.0-rc.2', enabled: true }
  const baseline = api.otherPluginFingerprint([own, shell])
  assert.equal(api.otherPluginFingerprint([shell]), baseline, 'this plugin must not affect its own index fingerprint')
  assert.notEqual(api.otherPluginFingerprint([own, { ...shell, version: '0.2.1' }]), baseline, 'a plugin update must invalidate')
  assert.notEqual(api.otherPluginFingerprint([own, { ...shell, enabled: false }]), baseline, 'a plugin toggle must invalidate')
  assert.notEqual(api.otherPluginFingerprint([own]), baseline, 'a plugin removal must invalidate')
  assert.equal(api.otherPluginFingerprint([]), api.otherPluginFingerprint([own]))
  // 0.2 plugin rows carry entryId/moduleName rather than id/name.
  assert.notEqual(
    api.otherPluginFingerprint([own, { id: 'ui-theme', npm: '@deepseek-ai/dsh-client-ui-theme', enabled: true }]),
    baseline,
  )
})

test('legacy plugin-card seats stay indexed for pre-0.2 builds only', () => {
  const { api } = load()
  const seats = Object.fromEntries(api.DEEP_SLOTS.map((config) => [config.slot, config.parent]))
  assert.equal(seats['settings.plugins.tab'], 'plugins', 'the Settings to Plugins tab seat is inside the panel and indexed')
  assert.equal(seats['settings.general.item'], 'general')
  assert.equal(seats['settings.plugin.item'], 'plugins', 'legacy seat stays indexed')
  assert.equal(seats['web-ui.plugin.item'], 'web-ui-plugins', 'legacy seat stays indexed')
  // 0.2 moves the plugin cards to its standalone Plugins panel, which the
  // settings-panel navigation cannot reach: indexing it would dead-end.
  assert.equal(seats['plugins.item'], undefined, 'the standalone panel seat must not be indexed')
})

test('the seat fingerprint stays meaningful on DSH 0.2, where the legacy card seats are empty', () => {  const { api } = load()
  const pages = [{ options: { id: 'general', order: 0, label: 'General' } }]
  const ctx = {
    effect: (fn) => fn(),
    get: () => null,
    inject: () => {},
    locale: { register: () => {}, bind: () => () => '', subscribe: () => () => {} },
    slots: {
      register: (name, id, options) => ({ name, id, options }),
      inject: (_slot, registrar) => registrar(),
      entries: (slot) => (slot === 'settings.section' ? pages : []),
      subscribe: () => () => {},
    },
  }
  api.apply(ctx)
  const model = api.__indexTestModel
  const before = model.slotsFingerprint()
  assert.notEqual(before, '[]', 'an empty fingerprint would disable every rebuild signal on 0.2')
  pages.push({ options: { id: 'plugins', order: 15, label: 'Plugins' } })
  assert.notEqual(model.slotsFingerprint(), before, 'a settings page appearing must invalidate a stored index')
})

// --- Log recording: the in-memory ring, the batched host write-through, and the viewer fallback ---

const logRouteCalls = (calls) => calls.filter((call) => String(call.url).includes('api/settings-search-log'))

test('log entries are batched to the host log route as one formatted line each', () => {
  const { api, calls } = load()
  api.log('info', '应用装载', { version: '1.14.0' })
  api.log('error', '导入失败')
  api.flushLogs()
  const [call] = logRouteCalls(calls)
  assert.ok(call, 'the host log route must be posted to')
  assert.equal(call.method, 'POST')
  assert.deepEqual(plain(call.headers), { 'content-type': 'application/json' })
  assert.equal(call.body.action, 'append')
  assert.equal(call.body.lines.length, 2)
  assert.match(call.body.lines[0], /^\d{4}-\d{2}-\d{2}T[\d:.]+Z \[info\] \[[0-9a-f]{8}:1\] 应用装载 \{"version":"1\.14\.0"\}$/)
  assert.match(call.body.lines[1], /\[error\] \[[0-9a-f]{8}:2\] 导入失败$/)
})

test('the debounce timer ships queued lines, and clearing drops them instead', () => {
  const { api, calls, sandbox } = load()
  let fire = null
  let delay = 0
  sandbox.setTimeout = (callback, ms) => { fire = callback; delay = ms; return 1 }
  sandbox.clearTimeout = () => {}
  api.log('info', 'a')
  assert.equal(delay, 1200, 'the batch must be debounced instead of posting per line')
  assert.equal(logRouteCalls(calls).length, 0)
  fire()
  assert.equal(logRouteCalls(calls).length, 1, 'the debounce must ship the queued line')

  api.log('info', 'b')
  api.discardPendingLogs()
  api.flushLogs()
  assert.equal(logRouteCalls(calls).length, 1, 'a cleared queue must not be shipped')
})

test('the session log text mirrors the on-disk line format for the viewer fallback', () => {
  const { api } = load()
  assert.deepEqual(plain(api.logTarget()), { dir: '', file: '', state: 'idle', detail: '', count: null })
  api.log('info', 'only line')
  assert.match(api.sessionLogText(), /^\d{4}-\d{2}-\d{2}T[\d:.]+Z \[info\] \[[0-9a-f]{8}:1\] only line$/)
})

test('a failing host log channel never throws and never logs about itself', async () => {
  const { api, calls } = load(async () => { throw new TypeError('Failed to fetch') })
  api.log('info', 'first')
  api.flushLogs()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(logRouteCalls(calls).length, 1)
  assert.equal(api.logTarget().state, 'fail')
  // The failed transport must not have queued a log line of its own.
  api.flushLogs()
  assert.equal(logRouteCalls(calls).length, 1)
})

test('the badge count follows the host file, not just this session', async () => {
  // The host reports the entries that exist on disk, including earlier runs.
  const { api, calls } = load(async () => json({ ok: true, count: 7, dir: 'D', file: 'F' }))
  assert.equal(await api.readLogCount(), 7)
  const [call] = logRouteCalls(calls)
  assert.equal(call.method, 'GET')
  assert.match(String(call.url), /api\/settings-search-log\?count=1$/)
  assert.deepEqual(plain(api.logTarget()), { dir: 'D', file: 'F', state: 'ok', detail: '', count: 7 })

  // A count that fails to arrive leaves the badge on the session fallback.
  const { api: offline } = load(async () => { throw new TypeError('Failed to fetch') })
  assert.equal(await offline.readLogCount(), null)
  assert.equal(offline.logTarget().count, null)
})
