# Motion: the eight named motions

Every Exo app plays these eight. Values are from `tokens/tokens.json` (`motion.named.*`); the CSS is in `dist/exo.css`
and the GPUI data is `named::*` in `dist/exo_tokens.rs`. Two curves: what appears, fades or changes state eases out
(`cubic-bezier(0.23, 1, 0.32, 1)`); large surfaces (card morph, page enter, sheet open) spring: damped at 0.85, settling in
260ms, overshooting by at most 1% (0.63% here). Small controls ease out and never overshoot. `linear` is for loops only.

Times: press 90ms, quick 120ms, base 160ms, move 220ms, flight 300ms, settle 260ms (the large-surface spring), progress fill 300ms.

Reduced motion (the OS setting, or Exo's own): nothing slides, grows, springs, flies or loops. Fades and instant changes
remain. Each motion's reduced variant is in the data; the tests check it.

| # | Motion | Kind | Channels (property, from to, duration, curve) | Leave | Reduced |
| --- | --- | --- | --- | --- | --- |
| 1 | `press` | state, on active | scale 1 to 0.97, 90ms out | scale back to 1, 120ms out | none (no give-way) |
| 2 | `hover-lift` | state, on hover; covers only | translateY 0 to -3px, brightness 1 to 1.06, 120ms out | the same back, 120ms out | brightness only (covers take light, never move) |
| 3 | `page-enter` | enter; a room or a page | opacity 0 to 1, 160ms out; translateX 12 to 0px, 260ms spring (settle) | opacity 1 to 0, 120ms out (the old page) | opacity 0 to 1 over 160ms; the leave fades over 120ms |
| 4 | `card-morph` | enter; a thing that changes size (FLIP) | flip progress 1 to 0, 260ms spring (settle) | none | none: the new size lands |
| 5 | `list-stagger` | enter; a list's first showing | opacity 0 to 1 and translateY 8 to 0px, both 280ms out; 24ms apart per item, the eighth and later together | none | opacity 0 to 1 over 160ms, no stagger |
| 6 | `sheet` | enter; open and close | scale 0.98 to 1, 260ms spring (settle); scrim opacity 0 to 1, 160ms out | scale 1 to 0.98, 120ms out (closing is not in DESIGN.md; see DECISIONS.md) | sheet and scrim fade over 160ms; close fades over 120ms |
| 7 | `toast` | enter; a notice | translateY -8 to 0px, 160ms out (the glass is there at once, it drops in) | opacity 1 to 0, 120ms out | instant, no rise, no fade |
| 8 | `progress` | enter; a bar | scaleX 0 to 1, 300ms ease-out (the fill); loops: a sheen translateX -100% to 100% over 1600ms and a glide -100% to 300% over 1400ms, both linear | none | the fill lands at once; no loops |

Popover: the sheet motion at its own values, scale 0.96 to 1 over 160ms from the trigger's side, leaving by a 120ms fade
(only glass that floats alone fades itself).

Loops (progress sheen and glide) pause while Exo is not focused. Entries always finish, so a page opened while the
window is in the background is never stuck invisible.

## Press and hover: state motions

A state motion holds its `channels` on the trigger and comes back through `leave`.

```css
.exo-motion-press { scale: 1; transition: scale var(--exo-dur-quick) var(--exo-ease-out); }
.exo-motion-press:active { scale: 0.97; transition: scale var(--exo-dur-press) var(--exo-ease-out); }
```

## List and sheet: enter motions

Enter motions are keyframes on the class, one animation per channel, so a channel can run on its own duration and curve.

```css
.exo-motion-list-stagger { animation: exo-list-stagger-0 var(--exo-dur-arrive) var(--exo-ease-out) both, exo-list-stagger-1 var(--exo-dur-arrive) var(--exo-ease-out) both;
  animation-delay: calc(min(var(--exo-index, 0), 7) * var(--exo-stagger)); }
```

Set `--exo-index` on each item. The generated CSS does exactly this; see `dist/exo.css`.

## Containers: menus, popovers and tooltips (owner, 2026-11-07)

A menu, dropdown, popover, context menu or tooltip animates its container only: one fade and scale, 0.96 to 1 on the
base time (`--exo-dur-base`), from the trigger's side (`transform-origin`). The same keyframes as the popover
(DECISIONS.md row 24); the container's own `scale` property, so it never fights a position set by `transform`.

Its rows, icons and text do not animate on their own: no stagger, no per-item fade or slide. Staggers are for large
page-level entrances only (a room's first load, onboarding). Sheets are not in this rule: they keep row 23 (scale only,
the glass never faded whole), and their parts arrive with the sheet, not in turn.

The trigger's side is set by the shared positioning helper, once for every popup: it writes `data-origin` (for example
`top-left`, `bottom-right`) from where the popup was placed against its trigger, and CSS maps it to `transform-origin`.

```css
.exo-menu { transform-origin: top left; animation: exo-menu-in var(--exo-dur-base) var(--exo-ease-out) backwards; }
@keyframes exo-menu-in { from { opacity: 0; scale: 0.96; } }
```

## GPUI

In exo-ui-kit, a motion is data plus a tween, not a CSS transition. `named::SHEET` gives the channels; the view keeps the
moving value on `Motion`:

```rust
use exo_design::tokens::{self as t, named, Curve, Prop};

// On open: play the sheet's scale channel over the settle time (260ms), on the spring.
let ch = named::SHEET.channels[0];          // Prop::Scale, 0.98 to 1.0, SETTLE, Curve::Spring
motion.to_from("sheet", ch.from, ch.to, ch.duration, ch.curve); // Motion takes curves from tokens (see GPUI.md)

// Reduced motion: the same channel, or none. Duration zero lands at once.
let channels = if motion.reduced { named::SHEET.reduced } else { named::SHEET.channels };
```

`Curve::at(x)` evaluates a curve at progress `x`; `stagger_delay(&named::LIST_STAGGER, index)` gives an item's delay;
`named::ALL` lists the eight. The tests in `exo_tokens.rs` check that curves land on their ends, the spring overshoots
at most 1%, small curves never overshoot, and reduced variants never move.
