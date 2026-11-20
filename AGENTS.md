# Exo — agent instructions

Shared resources for Exo Launcher and Exo Cinema; neither app is in this repo. Read the README of the part you change first.

| Path | What | Build and test |
| --- | --- | --- |
| `site/` | getexo.app source snapshot | `npm ci --prefix site`, `npm run build --prefix site`, `npm test --prefix site` |
| `workers/` | Cloudflare Workers for the site, updates and app services | `node --test workers/exo-updates/test/*.test.mjs` |
| `packages/design-system/` | Tokens (`tokens/tokens.json`) rendered to Rust and CSS | `npm run build --prefix packages/design-system`, then `npm run check` and `npm test` there |

## Rules

- Nothing here deploys. Never run `wrangler deploy`, publish, or change production Cloudflare resources, routes or secrets; Worker configs keep placeholder IDs (`SECURITY-SCRUB.md`).
- No secrets in commits: `.dev.vars` and `.env` stay local and ignored; only the `.example` files are committed.
- Release links and checksums change only in `site/src/releases.js` (`site/README.md` › Releases).
- Design tokens change only in `packages/design-system/tokens/tokens.json`; rebuild `dist/` and run `npm run check`. Every value chosen and why is in `DECISIONS.md`. The website uses no glass; the apps do.
- Native UI work moved from the retired `packages/ui-kit/` GPUI spike to an upcoming Rune fork (2026-11-20).
- The apps' look is Exo Launcher's [`DESIGN.md`](https://github.com/UhhErix/Exo-Launcher/blob/main/apps/launcher/DESIGN.md). Words are plain and short, in Exo's voice.

## Pull requests

One change per PR on a `devin/` branch against `main`. Fill in the template: what changed and how it was tested, and say plainly what was not checked. Never merge your own PR.
