# Contributing

> 中文版：[CONTRIBUTING.md](./CONTRIBUTING.md)

Thanks for improving `@objectivex666/dsh-settings-search`. This file covers the repository layout, the conventions, and the release flow; please read the `npm test` section before opening a pull request.

## Repository layout

| Path | Contents |
| --- | --- |
| `lib/index.js` | **Host half**: the log files (one per day, dated filenames, 100 MB caps per file and per folder) and the `GET`/`POST /api/settings-search-log` route |
| `lib/client.js` | **Browser half**: the settings-panel search UI, settings index, AI hints, model-config import, and log recording/viewing; shipped as `window.__ModuleLoader__.load({ id, factory })` |
| `cordis.patch.yml` | Composition patch: inserts the plugin as one profile row |
| `scripts/check.mjs` | Structural self-checks (host exports, manifest wiring, client handoff shape, version, theme-token allowlist) |
| `scripts/ai.test.mjs` | Browser-half regression tests (a sandboxed `window` / `fetch`) |
| `scripts/log.test.mjs` | Host-half log file and route regression tests (real temp directories) |
| `scripts/release.mjs` | Release helper: version validation, bilingual Release body, git tag |
| `README.md` / `README.en.md`, `CHANGELOG.md` / `CHANGELOG.en.md` | Documentation is maintained **in paired Chinese/English files** |

## Development environment

- Node.js ≥ 18 (CI uses 22). The package has **no runtime dependencies and no build step**, so `npm install` is not required.
- Install for local debugging with `dsh plugin --profile <profile> add <path-to-this-repo>`.
  The `desktop` profile is managed by the desktop app and cannot be driven from the CLI — install the local path from that app's plugin manager instead.
- **Restart DSH after changing code**: the plugin has both a host half and a client bundle, the default composition has no HMR, and both load at process/page start.

## Running the tests

```bash
npm test                                  # structural checks + every regression test (63 cases today)
node scripts/check.mjs                    # structural checks only
node --test scripts/ai.test.mjs           # browser half only
node --test scripts/log.test.mjs          # host half only
```

A pull request must leave `npm test` green. Fixing a bug means adding a case that reproduces it; adding a feature means covering both the success and the failure path.

## Code conventions

- Plain ESM, two-space indent, single quotes, no semicolons (match the existing code); document exported and meaningful internal helpers with JSDoc.
- **Support DSH 0.2 stable and earlier builds at once**: prefer the `remote.*` namespaces on the client and fall back to the older surface (for example `connection.api`) when they are missing. Never assume one API generation exists.
- The client bundle must stay `window.__ModuleLoader__.load({ id: packageName, factory })`, exporting `apply` / `inject`, with no side effects outside the factory.
- `PKG_VERSION` in `lib/client.js` must equal `package.json`'s `version` exactly (`scripts/check.mjs` enforces it).
- Styles may only use `--dsw-*` tokens that genuinely exist in DSH's theme registry; `scripts/check.mjs` keeps a verified allowlist, so check the stable theme first when adding one.
- **Never read, log, or export a user's API keys or account tokens**; logs, error text, and exports must not contain secrets. The plugin only uses API keys the user typed into its own panel.
- The package has zero runtime dependencies today; a new dependency needs its rationale and size impact in the pull request.
- Log writes must go through the host half's existing channel and limits (per day, per-file and per-folder caps, only files this plugin created).

## Commits and pull requests

1. Branch from `main` and keep the change focused.
2. Run `npm test` and verify the affected panel behaviour in a real DSH.
3. Commit style (see `git log`): `feat:`, `fix:`, `fix(ci):`, `docs:`, `chore:`, `refactor:`, with a body that explains the motivation rather than restating the diff.
4. A pull request should say what changed, why, and how it was verified (DSH version, reproduction steps, log excerpts); attach screenshots for UI changes.
   Name manual screenshots `tmp-*.png` — `.gitignore` already ignores that pattern, so they cannot be committed by accident.
5. Changes touching the release flow (version, changelog, workflows) should mention the corresponding release preview result.

## Release flow (maintainers)

Every release updates four places; missing any one is caught by `scripts/release.mjs` or CI:

1. `version` in `package.json`;
2. `PKG_VERSION` in `lib/client.js` (must match the above);
3. a new `## vX.Y.Z` section in `CHANGELOG.md` with 「新功能 / 修复」;
4. the same section in `CHANGELOG.en.md` with `Features / Fixes`.

```bash
node scripts/release.mjs --version X.Y.Z            # validate + preview the bilingual Release body
git tag vX.Y.Z && git push origin vX.Y.Z            # pushing the tag: CI publishes to npm and creates the GitHub Release
```

- The version must be a strict increment over the **latest version on npm** (`patch+1`, `minor+1.0`, or `major+1.0.0`); CI enforces this, and an already-published version is skipped rather than re-published.
- `node scripts/release.mjs --version X.Y.Z --publish` is the local fallback: it tags, pushes, and creates the Release, and needs an authenticated `gh`. Pushing the tag also makes CI attempt the same Release, so use one or the other — creating it twice fails.
- CI runs `npm test` before publishing, so `main` must stay green at all times.

## Reporting problems

Bugs, feature requests, and questions are all welcome in [GitHub Issues](https://github.com/objectivex666/dsh-settings-search/issues). To make them reproducible, please include: expected vs. actual behaviour, reproduction steps, the exported plugin log (API keys are never logged, so it is safe to paste), your DSH and plugin versions, Node version, OS/browser, and any useful screenshots or recordings.

## License

This project is licensed under GPL-3.0. By contributing you agree to publish your changes under the same license.
