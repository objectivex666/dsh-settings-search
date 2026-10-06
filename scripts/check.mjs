/**
 * Structural smoke checks for the installable package (run via `npm test`):
 *  1. the host half loads as ESM and exports a Cordis plugin (`apply`);
 *  2. the manifest carries the DSH bundle wiring (`dsh.bundle.patch`,
 *     `dsh.client.platform`, `exports["./client"]`);
 *  3. the client bundle registers the correct module id and its factory
 *     materializes to `{ apply, inject }` under a stub module table.
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const pkgUrl = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8'))
let failed = 0
const check = (cond, msg) => {
  if (cond) return
  failed += 1
  console.error(`FAIL: ${msg}`)
}

// 1. host half
const host = await import('../lib/index.js')
check(typeof host.apply === 'function', 'lib/index.js must export apply(ctx)')

// 2. manifest
check(pkg.dsh?.bundle?.patch, 'dsh.bundle.patch is missing')
check(pkg.dsh?.client?.platform === 'web', 'dsh.client.platform must be "web"')
const clientExport = pkg.exports?.['./client']
check(typeof clientExport === 'string', 'exports["./client"] must be a string path')
check(typeof pkg.exports?.['./cordis.patch.yml'] === 'string', 'exports["./cordis.patch.yml"] must be a string path')
check(Array.isArray(pkg.dsh.client.inject) && pkg.dsh.client.inject.every((i) => typeof i === 'string'),
  'dsh.client.inject must be a string array')

// 3. client bundle handoff
const source = readFileSync(new URL(`../${clientExport}`, import.meta.url), 'utf8')
let handoff = null
const sandbox = {
  window: {
    __ModuleLoader__: { load: (h) => { handoff = h } },
  },
}
vm.createContext(sandbox)
vm.runInContext(source, sandbox, { filename: clientExport })
check(handoff !== null, `client bundle must call window.__ModuleLoader__.load(...)`)
check(handoff?.id === pkg.name, `client module id must equal the package name (${pkg.name}), got ${handoff?.id}`)
const stubRequire = (spec) => {
  if (spec === 'react') {
    return { createElement: () => null, useState: () => [], useEffect: () => {} }
  }
  throw new Error(`unexpected require in client factory: ${spec}`)
}
const client = handoff.factory(stubRequire)
check(typeof client.apply === 'function', 'client half must export apply(ctx)')
check(Array.isArray(client.inject) && client.inject.includes('slots') && client.inject.includes('locale'),
  'client half inject must include "slots" and "locale"')

// 4. embedded version constant matches the manifest (update panel displays it)
const versionMatch = /const PKG_VERSION = '([^']+)'/.exec(source)
check(versionMatch !== null, 'lib/client.js must define const PKG_VERSION')
check(versionMatch?.[1] === pkg.version,
  `PKG_VERSION (${versionMatch?.[1]}) must equal package.json version (${pkg.version})`)

// 5. theme variables: every token the bundle styles with must exist in the DSH
//    0.2 theme registry (verified against @deepseek-ai/dsh-client-ui-theme).
//    A token that 0.2 never defines silently falls back to the inherited value.
const VERIFIED_THEME_TOKENS = new Set([
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-mask-1',
  '--dsw-alias-bg-module-platform',
  '--dsw-alias-bg-overlay',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-brand-primary',
  '--dsw-alias-interactive-bg-hover',
  '--dsw-alias-label-dimmed',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-state-error-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-shadow-lv2',
  '--dsw-shadow-lv3',
])
for (const token of new Set([...source.matchAll(/--dsw-[a-z0-9-]+/g)].map((match) => match[0]))) {
  check(VERIFIED_THEME_TOKENS.has(token),
    `lib/client.js uses ${token}, which the DSH 0.2 theme does not define`)
}

if (failed > 0) {
  console.error(`${failed} check(s) failed`)
  process.exit(1)
}
console.log(`ok: ${pkg.name}@${pkg.version} — host half, manifest, and client handoff are valid`)
