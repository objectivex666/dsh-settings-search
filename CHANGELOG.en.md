# Changelog

The changelog is bilingual; see [CHANGELOG.md](./CHANGELOG.md) for the Chinese version.

## v1.10.0

### ✨ Features
- **Search shortcut** — focus the search box with `Ctrl+F` or `⌘F` inside the settings panel; the popup-page style opens that page directly. You can enable or disable it from the "Settings Search" page, and disabling keeps the browser's default find behavior.

## v1.9.0

### ✨ Features
- **Mixed search style** — a new “window top bar + popup page” layout opens the popup results page when the top-bar input is focused or typed into; press `Esc` to close the popup.
- **Import DSH model config** — the AI API section can import the Base URL and model name from DSH's current default model and map it to OpenAI-compatible or Anthropic. It never reads, imports, or stores an API key.
- **Updated onboarding** — the guide now covers all four search styles. The “Don't show again” button and manual onboarding button were removed; the guide appears automatically only on first use after installation.
- **API-key storage hardening** — the AI API key now uses sessionStorage, and any legacy localStorage copy is removed automatically; the key only persists for the current browser session.

### 🐛 Fixes
- **Skin Center option labels** — searching for “启用皮肤中心” no longer merges conditional text such as “关闭后停用试穿、应用与背景控件，重新打开即恢复。” into the title. The description is stripped even when no punctuation precedes it.
- **Release pipeline hardening** — the release helper now validates strict semantic versions; GitHub Actions checkout no longer persists Git credentials, and npm publish uses `--ignore-scripts`.

## v1.8.0

### ✨ Features
- **First-run onboarding guide** — the first time the settings panel opens, a welcome modal introduces core features: instant search, pinyin & intent hints, AI hints, click-to-navigate, auto-index, and the built-in settings page. It can open the "Settings Search" page directly and be dismissed with "Don't show again". It only appears automatically once, after which you can reopen it from the "Settings Search" page's "Onboarding" button.
- **Clear-logs confirmation** — the "Clear logs" button now asks you to confirm before clearing, so logs are never wiped accidentally.
- **Clear API config** — a "Clear config" button in the AI section clears the Base URL, model, and API key after confirmation, so you can reset quickly. The API-key input also no longer triggers the browser's save-password prompt.
- **Test API service** — a "Test API" button in the AI section sends a minimal request to verify the Base URL, model, and API key, showing success or the failure reason inline; on failure it shows a readable hint based on the HTTP status / error type (auth failed, forbidden, endpoint not found, rate limited, server error, timeout, etc.).
- **In-page options are searchable** — options inside sections such as "Enable Workshop card" under Workshop can now be searched and clicked to jump, with the matching option highlighted.
- **Auto-index on startup** — the first time the settings panel opens, the plugin automatically visits every settings section, silently reads in-page options (e.g. "Enable Workshop card") into the search index, then restores your current section, so all section options are searchable without having to open each page manually. A short "Importing section options…" hint appears under the search box and disappears when it finishes.

### 🐛 Fixes
- **Truncated result names** — long setting names in search results are no longer cut off on a single line with an ellipsis; they now wrap to show the full name. In-page option label extraction now prefers the option's own name and strips trailing in-row description sentences (e.g. a "When disabled…" note), so results show just the setting name.
- **Hardened the AI endpoint URL** — the AI service Base URL is now validated: only http(s) is allowed, remote hosts must use https (so the API key is not sent in cleartext), and URLs with embedded credentials or dangerous schemes (e.g. `javascript:`, `data:`) are rejected. Unsafe URLs show a clear hint in "Test API" and are skipped by AI suggestions.

## v1.7.2

### ✨ Features
- **Issue submission guide** — the README's "Feedback & contributions" section now asks reporters to include a problem description, reproduction steps, logs (exportable from the "Settings Search" page), environment details, and screenshots/recordings so issues are easier to locate and reproduce.

### 🐛 Fixes
- Documentation only; no functional fixes.

## v1.7.1

### ✨ Features
- **View release notes** — a new button next to “Check for updates” fetches the GitHub release notes and shows them inline; if fetching fails it opens the release page automatically.
- **Issues welcome** — README now has a “Feedback & contributions” section inviting bug reports, feature ideas, and pull requests.

### 🐛 Fixes
- Unified the “Check for updates” button color with the “Save config” button for a consistent look.
- Ran a Codex Security review of the working tree: no reportable vulnerabilities found; no security regressions.

---

## v1.7.0

### ✨ Features
- **AI-assisted search** — when nothing matches locally, your own model (OpenAI-compatible / Anthropic) understands your intent and suggests settings. Off by default; configure it on the “Settings Search” page.
- **Logging & export** — records key plugin actions, searches, and AI requests; export a `.log`, copy, or clear them from the settings page. API keys are never logged.
- **Settings page restyle** — Vision Router-style card, the header no longer shows the version, and the panel collapses to a single row.
- **Vision Router-like update flow** — after checking, show a pinned-version install command plus an npx variant, with a “View release notes” link.

### 🐛 Fixes
- Fixed the update command to include `--profile` and the exact target version, so the plugin cannot be updated to the wrong release.
- Removed the redundant version from the settings header and fixed the card layout; the panel is now collapsible.

---

_Keep this file bilingual going forward; update CHANGELOG.md with the Chinese text as well._
