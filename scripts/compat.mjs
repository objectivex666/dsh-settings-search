#!/usr/bin/env node
/**
 * Harness compatibility audit.
 *
 * This plugin talks to DSH through surfaces that are not part of any public npm
 * API — client service names, Typert Remote descriptors, slot keys, theme
 * tokens, the host Fetch route registry, and the DeepSeek adapter constants.
 * `npm test` cannot see any of those, so run this against the Harness install
 * you are actually targeting:
 *
 *   node scripts/compat.mjs                       # auto-detect the install
 *   node scripts/compat.mjs --asar <app.asar>     # explicit archive
 *   DSH_ASAR=<app.asar> node scripts/compat.mjs   # or through the environment
 *
 * The archive is read read-only and nothing is written. The script exits
 * non-zero as soon as an assumption breaks — that moment is exactly when a
 * Harness upgrade needs this plugin adapted.
 */
import { closeSync, existsSync, openSync, readFileSync, readSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Candidate install locations, most specific first. */
const DEFAULT_ASAR_CANDIDATES = [
  'E:\\Program Files\\dsh\\resources\\app.asar',
  'C:\\Program Files\\dsh\\resources\\app.asar',
  '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar',
]

const argOf = (name) => {
  const at = process.argv.indexOf(name)
  return at >= 0 ? process.argv[at + 1] : undefined
}

/**
 * A minimal read-only Electron asar reader: a pickle-framed JSON header with
 * `{ size, offset }` per entry, the payload starting right after the header.
 * @param archive - absolute path to `app.asar`.
 */
const openAsar = (archive) => {
  const fd = openSync(archive, 'r')
  const sizeBuf = Buffer.alloc(8)
  readSync(fd, sizeBuf, 0, 8, 0)
  const headerSize = sizeBuf.readUInt32LE(4)
  const headerBuf = Buffer.alloc(headerSize)
  readSync(fd, headerBuf, 0, headerSize, 8)
  const jsonLength = headerBuf.readUInt32LE(4)
  const header = JSON.parse(headerBuf.toString('utf8', 8, 8 + jsonLength))
  const dataStart = 8 + headerSize
  const files = new Map()
  const walk = (node, prefix) => {
    for (const [name, entry] of Object.entries(node.files ?? {})) {
      const path = prefix === '' ? name : `${prefix}/${name}`
      if (entry.files !== undefined) walk(entry, path)
      else files.set(path, { size: entry.size, offset: Number(entry.offset) })
    }
  }
  walk(header, '')
  const reader = {
    archive,
    files,
    has: (path) => files.has(path),
    read(path) {
      const entry = files.get(path)
      if (entry === undefined) throw new Error(`no entry ${JSON.stringify(path)}`)
      const buffer = Buffer.alloc(entry.size)
      readSync(fd, buffer, 0, entry.size, dataStart + entry.offset)
      return buffer.toString('utf8')
    },
    close: () => closeSync(fd),
  }
  return reader
}

/** Locate the archive to audit. */
const resolveAsar = () => {
  const explicit = argOf('--asar') ?? process.env.DSH_ASAR
  if (explicit !== undefined && explicit !== '') {
    if (!existsSync(explicit)) throw new Error(`archive not found at ${explicit}`)
    return explicit
  }
  const found = DEFAULT_ASAR_CANDIDATES.find((candidate) => existsSync(candidate))
  if (found === undefined) {
    throw new Error('could not locate a Harness install — pass --asar <app.asar> or set DSH_ASAR')
  }
  return found
}

const checks = []
/**
 * Run one compatibility check. A check returns a short detail string, `true`,
 * or `undefined` when it passes, and throws (or returns `false`) when the
 * Harness no longer matches an assumption this plugin makes.
 */
const check = (label, run) => {
  try {
    const detail = run()
    checks.push({ label, ok: detail !== false, detail: detail === true || detail === undefined ? '' : String(detail) })
  } catch (error) {
    checks.push({ label, ok: false, detail: String(error?.message ?? error) })
  }
}

/** The client-half source of one package, whatever the platform file is named. */
const clientSourceOf = (archive, name, cache) => {
  if (cache.has(name)) return cache.get(name)
  const candidates = [
    `dsh/node_modules/@deepseek-ai/${name}/lib/client.js`,
    `dsh/node_modules/@deepseek-ai/${name}/lib/client.browser.js`,
  ]
  const found = candidates.find((path) => archive.has(path))
  if (found === undefined) throw new Error(`${name} ships no client bundle`)
  const text = archive.read(found)
  cache.set(name, text)
  return text
}

/** Assert one substring, reporting the missing needle. */
const mustInclude = (text, needle, message) => {
  if (!text.includes(needle)) throw new Error(message ?? `missing ${JSON.stringify(needle)}`)
}

const main = () => {
  const archivePath = resolveAsar()
  const archive = openAsar(archivePath)
  const cache = new Map()
  try {
    const connectionManifest = JSON.parse(archive.read('dsh/node_modules/@deepseek-ai/dsh-client-connection/package.json'))
    const source = readFileSync(join(ROOT, 'lib/client.js'), 'utf8')
    console.log(`Harness: ${archivePath}`)
    console.log(`Version: ${connectionManifest.version}\n`)

    check('client connection service is provided', () => {
      mustInclude(clientSourceOf(archive, 'dsh-client-connection', cache), 'provide("connection"', 'the connection handle is gone')
      return 'ctx.connection'
    })

    check('Remote namespaces live at remote.<namespace>', () => {
      const gateway = clientSourceOf(archive, 'dsh-api-gateway', cache)
      mustInclude(gateway, 'super(ctx, "remote")', 'the `remote` service is gone')
      mustInclude(gateway, 'remote.${namespace}', 'namespace service keys changed')
      return 'remote.<ns>'
    })

    check('settings/describe answers { namespaces: [{ ns, value }] }', () => {
      const settings = archive.read('dsh/node_modules/@deepseek-ai/dsh-api-settings-controller/lib/typert.remote-client.js')
      mustInclude(settings, "'namespaces'", 'describe value lost `namespaces`')
      mustInclude(settings, "'ns': z.string()", 'namespace view lost `ns`')
      mustInclude(settings, "'value': z.json()", 'namespace view lost `value`')
      return 'ok'
    })

    check('settings/describe takes no arguments', () => {
      const settings = archive.read('dsh/node_modules/@deepseek-ai/dsh-api-settings-controller/lib/typert.remote-client.js')
      const at = settings.indexOf("'settings/describe':")
      if (at === -1) throw new Error('the settings/describe descriptor is gone')
      if (!/parameters:\s*\[\s*\]/.test(settings.slice(at, at + 900))) throw new Error('settings/describe now takes parameters')
      return 'ok'
    })

    check('llm/listConfigurableProviders keeps settingsNs/settingsPath', () => {
      const llm = archive.read('dsh/node_modules/@deepseek-ai/dsh-llm/lib/typert.remote-client.js')
      mustInclude(llm, "'settingsNs'", 'rows lost settingsNs')
      mustInclude(llm, "'settingsPath'", 'rows lost settingsPath')
      return 'ok'
    })

    check('pluginManager inventories keep the fields the fingerprint reads', () => {
      const manager = archive.read('dsh/node_modules/@deepseek-ai/dsh-plugin-manager/lib/typert.remote-client.js')
      for (const field of ["'name'", "'version'", "'enabled'"]) {
        mustInclude(manager, field, `a bundle row lost ${field}`)
      }
      for (const field of ["'entryId'", "'moduleName'"]) {
        mustInclude(manager, field, `a plugin row lost ${field}`)
      }
      return 'name/version/enabled + entryId/moduleName'
    })

    check('host connection still owns the exact-Fetch route registry', () => {
      const host = archive.read('dsh/node_modules/@deepseek-ai/dsh-client-connection/lib/index.js')
      mustInclude(host, 'registerFetchRoute', 'the host fetch registry is gone')
      const segment = /const ENDPOINT_SEGMENT_PATTERN = \/\^\[([^\]]+)\]/.exec(host)
      if (segment === null) throw new Error('endpoint validation pattern not found')
      const sample = 'settings-search-log'
      if (!new RegExp(`^[${segment[1]}]+$`).test(sample)) throw new Error(`route segment ${sample} is no longer valid`)
      return `/api/${sample}`
    })

    check('every theme token this plugin uses exists in the Harness theme', () => {
      const theme = clientSourceOf(archive, 'dsh-client-ui-theme', cache)
      const defined = new Set([...theme.matchAll(/--dsw-[a-z0-9-]+/g)].map((match) => match[0]))
      const used = new Set([...source.matchAll(/--dsw-[a-z0-9-]+/g)].map((match) => match[0]))
      const missing = [...used].filter((token) => !defined.has(token))
      if (missing.length > 0) throw new Error(`missing: ${missing.join(', ')}`)
      return `${used.size} tokens`
    })

    check('the settings seats this plugin indexes still exist', () => {
      const seats = ['settings.header', 'settings.section', 'settings.plugins.tab', 'settings.general.item']
      const bundles = [...archive.files.keys()]
        .filter((path) => /^dsh\/node_modules\/@deepseek-ai\/dsh-client-ui-[^/]+\/lib\/client(\.browser)?\.js$/.test(path))
      const text = bundles.map((path) => archive.read(path)).join('\n')
      const missing = seats.filter((seat) => !text.includes(`"${seat}"`))
      if (missing.length > 0) throw new Error(`undeclared: ${missing.join(', ')}`)
      return `${seats.length} seats`
    })

    check('the Plugins inventory still renders the 会话/全局 groups this plugin mines', () => {
      const inventory = clientSourceOf(archive, 'dsh-client-ui-settings-plugin-inventory', cache)
      mustInclude(inventory, '"groupTitle"', 'the group title class hook is gone')
      mustInclude(inventory, '"data-plugin-scope"', 'the group scope attribute is gone')
      return 'groupTitle + data-plugin-scope'
    })

    check('the DeepSeek adapter constants the import fallback mirrors', () => {
      const deepseek = archive.read('dsh/node_modules/@deepseek-ai/dsh-llm-deepseek/lib/index.js')
      mustInclude(deepseek, '"https://api.deepseek.com/anthropic"', 'PUBLIC_BASE_URL changed')
      mustInclude(deepseek, '"DEEPSEEK_BASE_URL"', 'BASE_URL_ENV changed')
      mustInclude(
        archive.read('dsh/node_modules/@deepseek-ai/dsh-llm-deepseek-api-key/lib/index.js'),
        '"deepseek-official"',
        'the deepseek-official provider id changed',
      )
      mustInclude(
        archive.read('dsh/node_modules/@deepseek-ai/dsh-llm-deepseek-account/lib/index.js'),
        '"deepseek-account"',
        'the deepseek-account provider id changed',
      )
      return 'endpoint + two provider ids'
    })

    check('the client module loader still accepts this plugin\u2019s bundle format', () => {
      mustInclude(clientSourceOf(archive, 'dsh-client-modules', cache), '__ModuleLoader__', 'the __ModuleLoader__ facade is gone')
      mustInclude(source, 'window.__ModuleLoader__.load(', 'this plugin no longer uses the facade')
      return 'window.__ModuleLoader__.load({ id, factory })'
    })

    const failed = checks.filter((entry) => !entry.ok)
    const width = Math.max(...checks.map((entry) => entry.label.length))
    for (const entry of checks) {
      console.log(`${entry.ok ? 'PASS' : 'FAIL'}  ${entry.label.padEnd(width)}  ${entry.detail}`)
    }
    console.log(`\n${checks.length - failed.length}/${checks.length} compatibility checks passed`)
    if (failed.length > 0) {
      console.error('\nThis Harness needs the plugin adapted before it can be trusted here.')
      process.exitCode = 1
    }
  } finally {
    archive.close()
  }
}

main()
