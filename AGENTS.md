# Exo — agent instructions

Shared resources for Exo Launcher and Exo Cinema; neither app is in this repo. Read the README of the part you change first.

| Path | What | Build and test |
| --- | --- | --- |
| `site/` | getexo.app source snapshot | `npm ci --prefix site`, `npm run build --prefix site`, `npm test --prefix site` |
| `workers/` | Cloudflare Workers for the site, updates and app services | `node --test workers/exo-updates/test/*.test.mjs` |
| `packages/design-system/` | Tokens (`tokens/tokens.json`) rendered to CSS and `dist/exo_tokens.rs` (no app reads the Rust file) | `npm run build --prefix packages/design-system`, then `npm run check` and `npm test` there |

## Rules

- Deploy when the task calls for it. Worker configs in git keep placeholder IDs (`SECURITY-SCRUB.md`): deploy with the real ones, never commit them.
- No secrets in commits: `.dev.vars` and `.env` stay local and ignored; only the `.example` files are committed.
- Release links and checksums change only in `site/src/releases.js` (`site/README.md` › Releases).
- Design tokens change only in `packages/design-system/tokens/tokens.json`; rebuild `dist/` and run `npm run check`. Every value chosen and why is in `DECISIONS.md`. Exo Launcher's native tokens are hand-maintained in its `native-ui/crates/exo-kit/src/tokens.rs`: mirror a change there yourself. The website uses no glass; the apps do.
- Exo Launcher's native UI is `apps/launcher/native-ui` in Exo-Launcher, on our Rune fork `UhhErix/rune`, and the default since 4.0.0.
- The apps' look is Exo Launcher's [`DESIGN.md`](https://github.com/UhhErix/Exo-Launcher/blob/main/apps/launcher/DESIGN.md). Words are plain and short, in Exo's voice.

## Pull requests

One change per PR against `main`. Fill in the template: what changed and how it was tested, and say plainly what was not checked.

CI: `site-and-design.yml` (site tests, design-system check and tests; on `site/`, `workers/exo-site/`, `workers/exo-www/`, `packages/design-system/`) and `updater-worker.yml` (`workers/exo-updates/` tests).

## Reviews

Focus on correctness, security (secrets, Worker routes and bindings, unescaped output) and the rules above. Skip formatting and style the build or tests already cover, and generated output (`packages/design-system/dist/`; check it was rebuilt from `tokens.json` instead of reading it line by line).
