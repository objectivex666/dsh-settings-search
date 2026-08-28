# Changelog

The changelog is bilingual; see [CHANGELOG.md](./CHANGELOG.md) for the Chinese version.

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
