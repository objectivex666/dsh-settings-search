# dsh-settings-search

> Instant search for the DSH (Cordis) settings panel — quickly locate settings pages and general settings items.

[![npm version](https://img.shields.io/npm/v/@objectivex666/dsh-settings-search)](https://www.npmjs.com/package/@objectivex666/dsh-settings-search)
[![license](https://img.shields.io/npm/l/@objectivex666/dsh-settings-search)](./LICENSE)
[![node](https://img.shields.io/node/v/@objectivex666/dsh-settings-search)](https://nodejs.org)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/objectivex666/dsh-settings-search)

**English** · [中文](./README.md)

---

## Features

- 🔍 **Live search** — a search box in the settings panel filters every registered settings page (`settings.section`) and general item (`settings.general.item`) as you type.
- 🧩 **Three search styles** — choose the classic sidebar, window top bar, or popup search page. The choice is saved in the current browser.
- ⌨️ **Search shortcut (v1.10.0)** — focus the search box with `Ctrl+F` or `⌘F` inside the settings panel. You can enable or disable it from the "Settings Search" page; disabling keeps the browser's default find behavior.
- 🤝 **Import DSH model config (v1.9.0)** — import the Base URL and model name from DSH's current default model in the AI config section. When that default is a built-in DeepSeek route (whose settings carry no Base URL), the import uses DeepSeek's own endpoint, `https://api.deepseek.com/anthropic`. For credential safety, the API key is never imported.
- 🎯 **First-run onboarding (v1.9.0)** — a welcome modal appears only the first time the settings panel opens after installation. It introduces live search, pinyin and intent hints, AI hints, click-to-jump, the built-in settings page, and auto-indexing; there are no "Don't show again" or manual reopen buttons.
- 📂 **In-page option search (v1.2.0)** — search beyond pages and reach the specific options inside them: Plugins-page tabs (`settings.plugins.tab`), the **会话插件 / 全局插件** group titles on the Plugins page, the pre-0.2 plugin-card seats (`settings.plugin.item` / `web-ui.plugin.item`, both gone in 0.2), general rows, and more, each shown with a "page › option" breadcrumb.
- 🔤 **Pinyin association search (v1.5.0)** — type initials (`sz`) or full pinyin (`shezhi`) to surface Chinese settings items; navigate with `↑`/`↓`, confirm with `Enter`, dismiss with `Esc`, and matched text is highlighted.
- 🧠 **Intent search (v1.6.0)** — describe the goal in Chinese (e.g. 「太亮了」 "too bright", 「字太小」 "text too small") to surface matching settings without knowing their names, shown in a "You may want" group.
- 🤖 **AI-assisted search** — when nothing matches locally, your OpenAI-compatible, Anthropic, or local Ollama model understands your search intent and suggests settings. Off by default; configure it on the plugin's settings page. Ollama needs no API key.
- 💾 **Persistent settings index (v1.12.0)** — the first harvested settings index is stored locally. It rebuilds only on first use, after another plugin is installed, updated, enabled, or disabled, and can be rebuilt manually from the Settings Search page.
- 🧾 **Logging & viewing (v1.13.0 / v1.7.0)** — records key plugin actions, searches, and AI requests. Logs are written per local day as `$DSH_HOME/logs/dsh-settings-search/settings-search-YYYY-MM-DD.log`: one dated file per day, capped at 100 MB (the day then continues in numbered parts, `.1`, `.2`, …), with the whole folder held at 100 MB by deleting the oldest files — never the one being written. The plugin's page can **view logs**, **open the log folder**, copy, export, or clear them; the badge beside the "Logs" title counts today's file. API keys are never logged.
- 🧭 **Click-to-jump** — selecting a result clicks the matching left-nav entry to open its section; for tab options it also opens the tab and flashes the target row. A manual-path hint appears if automatic navigation is not possible.
- 🌱 **Auto-index on startup (v1.8.0)** — the first time the settings panel opens, the plugin automatically visits every settings section, silently reads in-page options (e.g. "Enable Workshop card") into the search index, then restores your current section, so all section options are searchable without having to open each page manually. A "Importing section options…" hint shows under the search box and clears when done.
- 🛠 **Built-in settings page (v1.4.0)** — a "Settings Search" page in the left navigation shows the current version and checks npm for a newer release on demand; when one exists it hands you a copy-ready upgrade command carrying the profile name and the latest version.
- 🧭 **View release notes (v1.7.1)** — the "Settings Search" page has a "View changelog" button next to "Check for updates"; it fetches the GitHub release notes and shows them inline, opening the release page if fetching fails.
- 🌐 **i18n** — built-in Chinese/English dictionaries that follow the DSH localization system and are easy to extend.
- 🎨 **Theme-aware** — styled entirely with CSS variables, automatically following the DSH theme (light/dark).
- ⚡ **Reactive** — subscribes to settings entries being added, removed, or changed, and refreshes results automatically.

---

## Installation (command line)

This plugin is a standard **DSH profile bundle**: once installed it wires itself into the settings panel — no manual edits to any DSH configuration file.

The commands below target a command-line profile. The desktop app manages its own `desktop` profile, which the CLI cannot touch — install the plugin for the desktop app from its plugin management page instead.

### Prerequisites

- **DeepSeek Harness (DSH)** — DSH 0.2 stable (desktop and `dsh web`) and earlier 0.1 builds; the plugin picks the API the running release offers. Verified against **0.2.1-rc.2** item by item (`npm run compat`); behaviour on 0.2.0 and earlier is unchanged.
- **Node.js** >= 18 (LTS recommended).

### From npm (recommended)

```bash
dsh plugin --profile web add @objectivex666/dsh-settings-search
```

### From GitHub

```bash
dsh plugin --profile web add github:objectivex666/dsh-settings-search
```

### From a local checkout (development)

```bash
dsh plugin --profile web add /path/to/dsh-settings-search
```

After installing, **restart DSH** (`dsh web`); the search box appears in the settings panel.

To uninstall: `dsh plugin --profile web remove @objectivex666/dsh-settings-search`.

> For a non-`web` profile, replace `--profile web` with your profile name.

---

## Manual wiring (when not using the command line)

Add the package to your profile's dependencies and declare it as a bundle layer (`dsh plugin add` does both for you):

```yaml
# your profile's cordis.patch.yml (or pass it via --patch)
- insert:
    - id: settings-search
      name: '@objectivex666/dsh-settings-search'
```

The package ships its own `cordis.patch.yml` (that exact content), which `dsh plugin add` applies automatically.

---

## Local Ollama (v1.11.0)

Enable "AI-assisted search" on the Settings Search page and select "Ollama (local)" as the API type:

- **Base URL**: defaults to `http://127.0.0.1:11434`; custom ports are supported. Accepts the root URL, `/api`, `/api/chat`, or `/v1`.
- **Model**: choose one returned by "Get models", or enter the full name, including its tag, of an installed model. Use `ollama list` to see installed models.
- **API key**: not required. Ollama requests never send an existing cloud API key.

Save the configuration and use "Test API" to check connectivity. Ollama requests allow 120 seconds for cold starts; cancelling a search aborts the request.

The plugin does not install or start Ollama, or download models. Prepare a running Ollama service and model yourself. Requests originate in the browser, so "local" means the browser's device, not a remote DSH server.

For connection failures, check the service URL. For cross-origin failures, add the exact DSH page origin (for example `http://127.0.0.1:3080`) to Ollama's `OLLAMA_ORIGINS` and restart Ollama. Avoid unnecessary wildcard origins. Non-local URLs still require HTTPS.

---

## Package layout

```
lib/index.js        Host half (log file + the `/api/settings-search-log` route)
lib/client.js       Browser half (search UI, __ModuleLoader__ format)
cordis.patch.yml    Composition patch: inserts the settings-search plugin row
scripts/check.mjs   Structural self-checks (npm test)
scripts/ai.test.mjs Mock AI and settings-index regression tests (no model execution)
scripts/log.test.mjs Host log file and route regression tests (temp dirs; never your own log folder)
```

## Development

```bash
npm test       # structural checks and mocked Ollama / OpenAI / Anthropic regression tests
npm run compat # audit compatibility against the Harness installed on this machine
```

`npm run compat` reads the local install (auto-detected; `--asar <app.asar>` or `DSH_ASAR=<app.asar>` also work) and checks the surfaces this plugin relies on that belong to no npm API — service names, Remote descriptors, slots, theme tokens, the Fetch route registry, and the DeepSeek constants. Run it first after a Harness upgrade to see exactly what moved.

> Historical note: up to v1.1 the repo shipped `dsh-settings-search.js` (an
> in-session `cordis_define` dynamic-plugin source). Because keeping it in
> sync with the shipping package kept drifting silently, it was removed in
> v1.4.1; retrieve it from git history (tag `v1.4.0`) if you need a reference.

## Feedback & contributions

Issues are welcome — please report bugs, suggest features, or ask questions in
[GitHub Issues](https://github.com/objectivex666/dsh-settings-search/issues).
Pull requests are equally welcome via
[GitHub Pull Requests](https://github.com/objectivex666/dsh-settings-search/pulls) —
please read [CONTRIBUTING.en.md](./CONTRIBUTING.en.md) first (layout, conventions, tests, and the release flow).

When submitting an issue, please include as much of the following as possible so we can locate and reproduce it:

- **Problem description**: what you expected vs. what actually happened.
- **Reproduction steps**: a step-by-step walkthrough, including the triggering keywords and the settings page involved.
- **Logs**: open the "Logs" section of the plugin's page, use "Export logs", and paste the recent search/runtime logs (API keys are never logged, so it is safe to share); include any console errors as well.
- **Environment**: DSH version, Node.js version, plugin version (shown on the "Settings Search" page), OS, and browser.
- **Screenshots / screen recording**: helpful for UI-related issues.

## Changelog & releases

Every version bump keeps git tags and GitHub Releases in sync, with a bilingual body that lists both new features and fixes:

- Update [CHANGELOG.md](./CHANGELOG.md) (Chinese) and [CHANGELOG.en.md](./CHANGELOG.en.md) (English), each with a features section and a fixes section (`新功能` / `修复` in Chinese, `Features` / `Fixes` in English).
- Bump `version` in `package.json` together with `PKG_VERSION` in `lib/client.js` (`npm test` enforces they match), add the version label next to any new feature, then tag and push as `vX.Y.Z`; GitHub Actions publishes to npm (`npm-publish.yml`) and creates a bilingual GitHub Release (`release.yml`).
- Preview the release body locally: `node scripts/release.mjs --version <ver>`
- Tag and publish for real: `node scripts/release.mjs --version <ver> --publish` (requires `gh` CLI, logged in)

> Without `--publish` the script only validates and prints the release body; it does not create a tag, push, or release.
