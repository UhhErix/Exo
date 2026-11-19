# Using the tokens in GPUI (exo-ui-kit)

`dist/exo_tokens.rs` is the GPUI side of the design system. It replaces `crates/exo-design/src/tokens.rs` in
exo-ui-kit with the same names and types, so no call site changes for the existing consts. What is new: the easing
curves, the spring table, the named motions, and the `Curve` evaluator.

exo-ui-kit is not edited by this work. The steps below are the adoption plan.

## 1. Drop the module in

Copy `dist/exo_tokens.rs` to `crates/exo-design/src/tokens.rs` (or keep it beside it and point `tokens` at it). Every
const `exo-design` uses today is there:

- Colours: `VOID`, `FG`, `MUTED`, `FAINT`, `LINE`, `LINE_SOFT`, `HAIRLINE`, `CONTROL_LINE`, `TILE`, `SOLID`, `GOOD`,
  `WARN`, `BAD`, `PRIMARY`, `PRIMARY_FG`, `PRIMARY_HOVER`, `HOVER`, `PRESSED`, `SELECTED`, `TRACK`, `SCRIM`, `RIM`,
  `RIM_PRESSED`, the glass and panel inks, `PANEL_OVERLAY`, `SHADOW_RAISED`.
- Shape: `GAP`, `BAR_HEIGHT`, `CARD_RADIUS`, `PANEL_RADIUS`, `SHEET_RADIUS`, `ROW_RADIUS`, `PILL`, `MENU_ROW`,
  `MENU_WIDTH`, `BUTTON`, `BUTTON_COMPACT`, and `BUTTON_PRIMARY`, `RADIUS_XS`, the `SPACE_*` steps.
- Type: `TEXT_TITLE`, `TEXT_BODY`, `TEXT_SMALL`, `TEXT_PAGE`, `TEXT_FIRST_RUN`, `FONT_SANS`, `FONT_MONO`.
- Motion durations: `PRESS`, `QUICK`, `BASE`, `MOVE`, `FLIGHT`, `HOLD`, `ARRIVE`, `STAGGER`, `DONE_HOLD`.
- Glass tones: `SMALL_GLASS`, `LARGE_GLASS`, `MENU_GLASS`, `PLATE_GLASS`, `PANE_GLASS`, and `GlassTone` with its five fields.

Values that changed against the current file are listed in `DECISIONS.md` (muted `#9d9d9d`, faint `#868686`, menu row 34,
menu glass at 20px). Check them in the gallery before merging.

## 2. Replace the spring in `motion.rs`

`Ease::Spring` in `crates/exo-design/src/motion.rs` overshoots by about 6%, and its own test asserts it. The design now lets
large surfaces overshoot by at most 1% (damped 0.85, settling in 260ms, 0.63% at the peak); the table gives that exactly.
Replace the formula with the table:

```rust
use exo_design::tokens::{Curve, EASE_OUT, EASE_IN_OUT, EASE_LINEAR};

// Call sites change with the type: Ease::Out -> Curve::Cubic(EASE_OUT), Ease::InOut -> Curve::Cubic(EASE_IN_OUT),
// Ease::Linear -> Curve::Cubic(EASE_LINEAR), Ease::Spring -> Curve::Spring (the damped table: 0.63% over at its peak).
// `Curve::at(x)` is the eased value at progress x.
```

Delete the private `bezier` and the spring arithmetic in `motion.rs`, and the test asserting the old 6% overshoot
(`> 1.0`). The new test checks the 1% bound against `SPRING_OVERSHOOT`. Keep the test that curves start at 0 and land on 1.

## 3. Glass

Glass is a backdrop blur under one even line. The tone decides how much it blurs and dims:

```rust
use exo_design::{glass::glass, tokens as t};

glass(t::LARGE_GLASS, t::PANEL_RADIUS) // a floating panel: 20px blur, the overlay, the raised shadow
    .p(px(t::SPACE_4XL))
```

Small glass (`SMALL_GLASS`) for controls and capsules, `PANE_GLASS` for a side panel under its content, `PLATE_GLASS`
for words over art. The web site does not use glass; the GPUI apps do.

## 4. Type and layout

Set the family once (`FONT_SANS`, Geist), then the sizes: `TEXT_BODY` for controls and body (13px, medium for controls),
`TEXT_SMALL` for secondary words (12px), `TEXT_TITLE` for titles (20px, semibold). Lay out a window as on a 1080p screen
and scale it (`DESIGN_WIDTH`, `DESIGN_HEIGHT`).

## 5. Named motions

A named motion's channels are the data a view animates:

```rust
use exo_design::tokens::{named, Prop};

// The list stagger: item i starts stagger_delay(i) late, the eighth and later together.
let delay = exo_design::tokens::stagger_delay(&named::LIST_STAGGER, i);
// The press: scale to 0.97 on PRESS, back on QUICK.
let press = named::PRESS.channels[0]; // Prop::Scale, 1.0 to 0.97
```

`Motion::to_from` (exo-design `motion.rs`) takes a `Curve` once step 2 is done. Frames are requested only while a value
moves, as today. Loops (the progress sheen and glide) keep requesting frames while the window is active; stop them when
it is not (check the active-window state in the pinned gpui).

## 6. Test it

`cargo test -p exo-design` runs the existing tests plus the `exo_tokens` tests once the file is in place: curves land on
their ends, the spring overshoots at most 1%, small curves never overshoot, reduced variants never move, a sheet does not fade its glass, stagger is 24ms
with the eighth and later together.

## Not verified

The module compiles and its tests pass against a stand-in for `gpui::Rgba` (`tests/rust.test.mjs`). The real crate was
not built: it needs the patched gpui in `vendor/`. The gallery's look has not been checked against these values.
