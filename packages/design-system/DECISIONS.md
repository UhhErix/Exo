# Decisions

Every value in `tokens/tokens.json` is here or has its source named. Where the audited sources disagreed, the majority
of the CSS (Launcher, Cinema, Browser, ExoOS, the site) and exo-ui-kit's `exo-design` decide, unless the code itself
contradicts the doc. Paths are relative to the Exo repos.

## Scope

- **Primary target: Rust/GPUI.** `dist/exo_tokens.rs` is a drop-in for `exo-ui-kit/crates/exo-design/src/tokens.rs`:
  every const there is present with the same name and type. The curves, the spring, and the eight named motions are
  added.
- **Secondary: CSS for the website (`exo.css`) and HTML prototypes.** The style page (`dist/index.html`) is generated.
- **Dropped:** the TypeScript generator, the XAML generator, and adoption plans for the Launcher, Browser, Cinema and
  ExoOS web UIs. The owner's brief named them; the scope change removed them.
- **Website: no glass.** Owner decision: grey translucent panels look fake to him. `dist/exo.css` (the site) has no glass
  classes, no `backdrop-filter`, no glass custom properties. Glass lives in `dist/exo-glass.css`, which only the style
  page loads, and in `exo_tokens.rs` for the apps.
- **Void only.** Launcher has Light and Dark appearances. The house rule is Void black with Liquid Glass only, and
  exo-ui-kit draws Void only. The system has one appearance.

## Conflicts found in the audit, and the value chosen

| # | Token | Sources disagree | Chosen | Why |
| --- | --- | --- | --- | --- |
| 1 | Muted text | exo-ui-kit `MUTED` `#b4b4b4`; Launcher, Cinema, ExoOS, site `#9d9d9d` | `#9d9d9d` | Majority of CSS; the crate's own doc says it follows `tokens.css`. |
| 2 | Faint text | exo-ui-kit `FAINT` `#9a9a9a`; Launcher, Cinema, ExoOS `#868686` | `#868686` | Majority; Launcher's table says faint is 5.7:1 and never for words you must read. |
| 3 | Menu row height | exo-ui-kit `MENU_ROW` 38; Launcher CSS 34px (five declarations) and DESIGN.md's "34px rows" | 34 | Spec and most code agree. |
| 4 | Menu glass | exo-ui-kit `MENU_GLASS` blur 16 (its comment: "as the shipped page computes it"); DESIGN.md: large glass is 20px | large glass, 20px | One large-glass tone; menus, popovers and sheets float the same way. `MENU_GLASS` is kept as an alias. |
| 5 | Spring | exo-ui-kit `Ease::Spring` overshoots about 6% (its test asserts > 1.0); Launcher `tokens.css` `linear()` table and DESIGN.md: never overshoots (0.15%) | the `linear()` table, damped at 0.85: large surfaces only, settles in 260ms, overshoots 0.63% (the cap is 1%). Small controls ease out and never overshoot. | Revised by the owner: the old "no bounce anywhere" rule is obsolete. Tests fail any overshoot above 1% and any spring on a small control. **exo-ui-kit's `Ease::Spring` needs replacing** (see `docs/GPUI.md`). |
| 6 | Typeface | Launcher, ExoOS, ExoBrowser: Inter; Cinema, site, exo-ui-kit: Geist | Geist | Owner's brief; exo-ui-kit already ships Geist. Inter's features (ss01, cv05, ss07) do not apply to Geist and are dropped. Launcher would need a re-check of its numerals. |
| 7 | Geist Mono | Not in any repo | token defined, falls back to `ui-monospace` | Downloading a font needs owner permission. See "Not done". |
| 8 | Title weight | Launcher DESIGN.md: 650 in Inter's Display cut | 600 (semibold) | Geist ships static cuts 300 to 700 in exo-ui-kit; no 650. |
| 9 | Bad | ExoOS `glass.css` `#ff6b6b`; Launcher, Cinema `#ff5c5c` | `#ff5c5c` | Majority. |
| 10 | Large glass overlay | Launcher DESIGN.md: `rgb(44 44 46 / 0.78)`; Launcher `tokens.css`, exo-ui-kit, Cinema, ExoOS: black 36% | black 36% | Code agrees with itself; the doc text is out of date. |
| 11 | Glass grain | Owner's brief asks for noise; Launcher's `glass.css` removed its grain on purpose ("read as film grain over clear glass") | none | Launcher's removal is the shipped decision. No token. |
| 12 | Glass glow | Owner's brief asks for glow; DESIGN.md: "no glow, no tint" on the page; "no lit top, shaded foot, inner glow or top sheen" on glass | none | DESIGN.md rules. |
| 13 | Glass sheen / highlight | Launcher `--glassy-sheen: none` on Void; DESIGN.md none | none | Same. |
| 14 | Window gutter | ExoOS `base.css` 24px; Launcher and Cinema 10px | 10px (`space.inset`) | Launcher's DESIGN.md is the spec; ExoOS is not in the new scope. |
| 15 | Bar height | Launcher `--exo-bar-h` 52px (band); exo-ui-kit `BAR_HEIGHT` 36 (capsule) | both: `size.band` 52, `size.capsule` 36 | Different things: the band the capsules float in, and the capsule. |
| 16 | Profile and collectibles curves | Launcher `profile.css` and ExoOS, Cinema profile: `cubic-bezier(0.16, 1, 0.3, 1)`; Launcher `discord-collectibles.css`: `(0.44, 0.29, 0.48, 1)` | not adopted | DESIGN.md: the profile is exempt from Exo's motion times and curves by design. The collectibles curve is not in DESIGN.md; left as is for its owner to decide. |
| 17 | Site enter curve | exo-site `site.css`: `cubic-bezier(.3, .6, .5, 1)` on its page entrance | not adopted | Site's own; a site decision. It should move to `motion.curve.out` when the site adopts the system. |
| 18 | Contrast of secondary text on large glass | Launcher DESIGN.md: `#dcdcdc` is 4.1:1 over white art | measured 3.85:1 | Computed here with WCAG on the worst backdrop (pure white through brightness 0.66 and the 36% overlay). `#e4e4e4` (glass-secondary, small glass) measures 4.15:1. Under Launcher's own thresholds (under 3:1 fails, under 4.5:1 warns) `#dcdcdc` warns and does not fail. Not changed; recorded. |
| 19 | Radius | CSS uses 8, 14, 10, 6, 12, 18, 4 (counts 222, 150, 100, 93, 59, 34, 84); DESIGN.md names 8 rows, 14 cards and menus, 18 panels, 24 sheets, 999 pills | DESIGN.md's five plus `xs` 4 | 10, 6 and 12 are one-off values outside the named scale. |
| 20 | Z-index | Launcher CSS uses 1 to 6, 20, 30, 40 | scale 0, 10, 20, 30, 40, 50 | 20, 30 and 40 are the ones used for overlays. 10 (the Bar) and 50 (notices) are added so each layer has a name. |
| 21 | Hover lift brightness | DESIGN.md: "takes a little light" with no value | `brightness(1.06)` over 120ms | A value had to be picked; it is small enough not to read as white. Review by eye. |
| 22 | Toast enter | DESIGN.md: notices are "there at once" under glass, and "leave by fading" | enter is a rise of 8px; leave is a fade on the quick time | Glass that fades whole loses its backdrop (DESIGN.md › Appear). |
| 23 | Sheet close | DESIGN.md gives the open motion only | scale 1 to 0.98 on the quick time | Closing is not specified. A sheet's glass is never faded whole, so it shrinks instead of fading. Mirrored, not invented. |
| 24 | Popover | DESIGN.md: 0.96 to 1 on the base time from the trigger | a variant of the sheet motion (see `docs/MOTION.md`) | Eight motions, as the brief asks. |
| 25 | Done hold | DESIGN.md: about 2.4s before the art eases back; `tokens.css` `--dur-hold` is 3000ms for notices | `motion.duration.doneHold` 2400 and `hold` 3000 | Two different holds in the spec. |
| 26 | Stagger cap | DESIGN.md: "24ms apart, the eighth and later together" | cap at index 7 (`staggerCap` 7) | Index 7 is the eighth item, zero-based. |
| 27 | Reading size | Chat bodies and embeds at 13px read too small; the Launcher's UI labels share 13 | `type.size.read` 15px at line height 1.375 (`--text-read`) for long-form reading only: chat message bodies, embed descriptions, the composer. 13 stays for UI labels. Owner session decision, 2026-11-07. | Names in lists stay 13/500. |
| 28 | Container-only motion (owner, 2026-11-07) | Owner's design tip: menus, dropdowns, popovers, context menus and tooltips animate the container only; their children do not animate on their own | The container alone fades and scales from 0.96 to 1 on the base time, from the trigger's side (`transform-origin`), as row 24. Rows, icons and text of those surfaces do not animate on their own: no stagger, no per-item fade or slide. Staggers stay for large page-level entrances only (a room's first load, onboarding). Sheets are not part of this rule: they keep row 23 (scale only, the glass never faded whole). | Applied in the Launcher: `exo-menu-in` on the menu containers; the origin comes from the shared positioning helper as `data-origin`. Sheets' parts no longer stagger. |

## Other decisions

- **Spacing:** 4, 6, 8, 10 (inset), 12, 16, 20, 24, 32, the values the specs name (DESIGN.md: 26 and 32 panel padding,
  16px 20px cards). 26 is not a token; it can be 24 or 32.
- **Sizes:** control 32, compact 28, primary 44, capsule 36, band 52, menu row 34, row 42, settings row 62, switch
  40 by 24, knob 14, progress 3, 4, 6.
- **Type:** 10 label, 12 small, 13 body and controls, 15 read (chat bodies, embeds, the composer; line height 1.375), 20 title, 28 page, 32 first run. Controls medium 500, body
  regular 400, titles semibold 600. No letter-spacing; no uppercase.
- **Glass tones:** small (blur 10, brightness 0.62, saturate 1.8, clear), large (blur 20, brightness 0.66, saturate 1.8,
  black 36%), pane (blur 14, brightness 0.62), plate for words over art (blur 10, brightness 0.34, contrast 0.9,
  saturate 1.6). Contrast 1.0 on Void (Launcher's 0.9 is for Dark).
- **Rim:** one line, `ink.rim` 14% white, 1px, inset. Same on every glass.
- **Motion durations:** press 90, quick 120, base 160, move 220, flight 300, arrive 280, settle 260 (large surfaces), progress fill 300, hold 3000, stagger 24, sheen 1600, glide 1400. Curves: out `cubic-bezier(0.23, 1, 0.32, 1)`, in-out `cubic-bezier(0.77, 0, 0.175, 1)`, linear (loops only), and the spring table (large surfaces only).
- **Motion revision (owner, later):** large surfaces (card morph, page enter, sheet open) use a gentle physical spring: damping ratio 0.85, settling within 0.1% in 260ms, peak overshoot 0.63% (capped at 1%). Small controls ease out and never overshoot: press 90ms, hover lift 120ms, toast 160ms, list stagger 280ms with 24ms steps, progress fill 300ms. The progress fill was linear in DESIGN.md; the owner's list says ease-out, so it is ease-out now. Loops (sheen, glide) stay linear.
- **Reduced motion:** every motion has a reduced variant that is fades and instant changes only. The tests check that
  nothing spatial, looping or springing survives, and that durations are never longer than the base time.
- **Icons:** Tabler outline, stroke 1.875 on a 24 grid, sizes 16, 20, 24. Ten glyphs are copied into `icons/` for the
  style page; `icons/LICENSE-Tabler.txt` is Tabler's MIT licence.
- **Geist:** `dist/fonts/Geist-Variable.woff2` and its licence come from ExoBrowser's `ui/public/fonts`; no download.

## Not done (needs the owner)

- **Geist Mono** is not bundled. Downloading it needs your permission (file name, source, size). The mono token falls
  back to `ui-monospace`.
- **exo-ui-kit is not edited.** It is on branch `spike/gpui-pre-0.3.11`, committed and idle, and this work only reads it.
  The adoption steps are in `README.md` and `docs/GPUI.md`.
- **Not verified on screen:** the style page's motions are not played in a browser (the screenshot is a still).
  Glass is not measured on real art; the contrast figures are on the worst-case backdrop.
- **The GPUI build is not run.** The Rust module compiles and its tests pass against a stand-in for `gpui::Rgba`; the
  real crate needs the patched gpui in `vendor/`.
