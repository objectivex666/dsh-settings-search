# dsh-settings-search

> Instant search for the DSH (Cordis) settings panel — quickly locate settings pages and general settings items.

[![npm version](https://img.shields.io/npm/v/@objectivex666/dsh-settings-search)](https://www.npmjs.com/package/@objectivex666/dsh-settings-search)
[![license](https://img.shields.io/npm/l/@objectivex666/dsh-settings-search)](./LICENSE)
[![node](https://img.shields.io/node/v/@objectivex666/dsh-settings-search)](https://nodejs.org)

**English** · [中文](./README.md)

---

## Features

- 🔍 **Live search** — a search box at the top of the settings panel's left navigation filters every registered settings page (`settings.section`) and general item (`settings.general.item`) as you type.
- 📂 **In-page option search (v1.2.0)** — search beyond pages and reach the specific options inside them: Plugins-page tabs (`settings.plugins.tab`), Web UI plugin cards (`web-ui.plugin.item`), general rows, and more, each shown with a "page › option" breadcrumb.
- 🔤 **Pinyin association search (v1.5.0)** — type initials (`sz`) or full pinyin (`shezhi`) to surface Chinese settings items; navigate with `↑`/`↓`, confirm with `Enter`, dismiss with `Esc`, and matched text is highlighted.
- 🧠 **Intent search (v1.6.0)** — describe the goal in Chinese (e.g. 「太亮了」 "too bright", 「字太小」 "text too small") to surface matching settings without knowing their names, shown in a "You may want" group.
- 🤖 **AI-assisted search (v1.7.0)** — when nothing matches locally, your own model (OpenAI-compatible or Anthropic: Base URL / model / API key) understands your search intent and suggests settings. Off by default; configure it on the plugin's settings page.
- 🧾 **Logging & export (v1.7.0)** — records key plugin actions, searches, and AI requests; export, copy, or clear them from the plugin's settings page for troubleshooting. API keys are never logged.
- 🧭 **Click-to-jump** — selecting a result clicks the matching left-nav entry to open its section; for tab options it also opens the tab and flashes the target row. A manual-path hint appears if automatic navigation is not possible.
- 🌱 **Progressive indexing** — self-drawing settings rows are harvested from the rendered DOM (via their `[data-slot]` anchors) the first time their page is visited, then stay searchable.
- 🛠 **Built-in settings page (v1.4.0)** — a "Settings Search" page in the left navigation shows the current version and checks npm for a newer release on demand; when one exists it hands you a copy-ready `dsh plugin update` command.
- 🌐 **i18n** — built-in Chinese/English dictionaries that follow the DSH localization system and are easy to extend.
- 🎨 **Theme-aware** — styled entirely with CSS variables, automatically following the DSH theme (light/dark).
- ⚡ **Reactive** — subscribes to settings entries being added, removed, or changed, and refreshes results automatically.

---

## Installation (command line)

This plugin is a standard **DSH profile bundle**: once installed it wires itself into the settings panel — no manual edits to any DSH configuration file.

### Prerequisites

- **DeepSeek Harness (DSH)** — any release that ships the web UI (`dsh web`).
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

After installing, **restart DSH** (`dsh web`); the search box appears at the top of the settings panel.

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

## Package layout

```
lib/index.js        Host half (no-op — makes the package a valid Cordis plugin row)
lib/client.js       Browser half (search UI, __ModuleLoader__ format)
cordis.patch.yml    Composition patch: inserts the settings-search plugin row
scripts/check.mjs   Structural self-checks (npm test)
```

## Development

```bash
npm test   # validates the host half, the dsh.client manifest, and the client bundle handoff
```

> Historical note: up to v1.1 the repo shipped `dsh-settings-search.js` (an
> in-session `cordis_define` dynamic-plugin source). Because keeping it in
> sync with the shipping package kept drifting silently, it was removed in
> v1.4.1; retrieve it from git history (tag `v1.4.0`) if you need a reference.

## Changelog & releases

Every version bump keeps git tags and GitHub Releases in sync, with a bilingual body that lists both new features and fixes:

- Update [CHANGELOG.md](./CHANGELOG.md) (Chinese) and [CHANGELOG.en.md](./CHANGELOG.en.md) (English), each with `### ✨ Features` and `### 🐛 Fixes` sections.
- Bump the version in `package.json` and the README, then tag and push as `vX.Y.Z`; GitHub Actions publishes to npm (`npm-publish.yml`) and creates a bilingual GitHub Release (`release.yml`).
- Preview the release body locally: `node scripts/release.mjs --version <ver>`
- Tag and publish for real: `node scripts/release.mjs --version <ver> --publish` (requires `gh` CLI, logged in)

> Without `--publish` the script only validates and prints the release body; it does not create a tag, push, or release.
