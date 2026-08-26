/**
 * dsh-settings-search — host half.
 *
 * This plugin is client-only: every feature lives in the browser half
 * (`./client` export, `lib/client.js`). This host half exists so the package
 * is a *valid* Cordis plugin row when installed as a DSH profile bundle
 * (`dsh plugin add @objectivex666/dsh-settings-search`): the profile
 * composition loads the package's main entry as a plugin, and the bundle's
 * `dsh.client` declaration tells the web app to fetch and mount the browser
 * half. A no-op host is all that is required here.
 */

/** Plugin row id used by cordis.patch.yml (also the settings-nav id filter). */
export const name = 'settings-search'

/**
 * Host half entry point. Nothing to do on the host — the search UI lives in
 * the browser and needs no host services or RPC.
 */
export function apply() {
  // client-only plugin; intentionally empty on the host
}
