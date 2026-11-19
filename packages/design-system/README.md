# Exo design system

One source for how Exo looks and moves: `tokens/tokens.json` (W3C design tokens). It renders the Rust module GPUI uses
and the CSS the website uses. The apps are GPUI, so Rust is the primary output; the website and HTML prototypes take
the CSS. The website uses no glass; the apps do.

```
npm run build   # render dist/ from tokens/tokens.json
npm run check   # fail if dist/ is out of date
npm test        # schema, contrast, motion, generator snapshots, and the Rust module compiled and tested
```

No dependencies: Node 22 or newer, and `rustc` for the Rust test.

| Output | For | Notes |
| --- | --- | --- |
| `dist/exo_tokens.rs` | exo-ui-kit's `exo-design` crate (GPUI) | Drop-in for its `tokens.rs`, plus curves, spring and the eight motions. |
| `dist/exo.css` | exo-site and HTML prototypes | No glass. Tokens, type, motion, icons. |
| `dist/exo-glass.css` | the style page and HTML prototypes of the apps | Never loaded by the site. |
| `dist/index.html` | a person reading the system | Generated from the same tokens; every motion is playable. |
| `dist/fonts/` | the CSS | Geist (from ExoBrowser's `ui/public/fonts`, OFL, licence included). |
| `icons/` | the style page | Ten Tabler outline glyphs (MIT). |

Documents: `DECISIONS.md` (the audit's conflicts and every value chosen), `docs/MOTION.md` (the eight named motions),
`docs/GPUI.md` (how exo-ui-kit uses the module).

## Adoption

Two consumers, both planned here and not applied.

**exo-ui-kit (Rust, branch `spike/gpui-pre-0.3.11`).**
1. Vendor the module with a sync script, pinned to a design-system commit: copy `dist/exo_tokens.rs` to
   `crates/exo-design/src/tokens.rs`, and write the commit into a header line. A `--check` mode fails CI when the copy
   differs from the pinned commit.
2. Replace `Ease::Spring`'s formula and the `Ease` enum in `motion.rs` with `Curve` (`docs/GPUI.md` step 2). This is the
   one change that alters behaviour: large surfaces now spring (damped 0.85, settle 260ms, at most 1% overshoot) and small controls never overshoot.
3. Run `cargo test -p exo-design` and the gallery; check the changed values (muted, faint, menu row, menu glass) by eye.

**exo-site (CSS, branch `feature/redesign`).**
1. Copy `dist/exo.css` and `dist/fonts/Geist-Variable.woff2` into the site's source, and load `exo.css` before `site.css`.
2. Replace the site's own `--muted`, `--line` and `--ease` with the tokens (`--exo-text-muted`, `--exo-hairline`,
   `--exo-ease-out`). The site's entrance curve `cubic-bezier(.3, .6, .5, 1)` moves to `--exo-ease-out`.
3. The site loads no glass. `exo-glass.css` is not copied.
4. Its build hashes the CSS (`assets.json`); the copy happens before that step.

Not in scope: Launcher, Browser, Cinema and ExoOS web UIs (dropped by the owner's scope change).

## Not done

- Geist Mono is not bundled (needs the owner's permission to download it). The mono token falls back to `ui-monospace`.
- exo-ui-kit is not edited. exo-site is not edited.
- The GPUI build is not run here; the Rust module is compiled and tested against a stand-in for `gpui::Rgba`.
