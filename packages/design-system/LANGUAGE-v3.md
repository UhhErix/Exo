# Exo design language v3: Void & Light

Proposed 2026-11-09 by Claude (main session) for the GPUI apps, at the owner's request. It is for after Launcher
3.25.0. It builds on `misc/design-language/LANGUAGE-v2.md` (2026-11-07) and supersedes it where they differ.
Mock-ups: the private design canvas "Exo Design Language" (https://claude.ai/artifact/RM1PZWPAFymnLCwdQdqjr7), eight
boards: Launcher Library, Game, PC; Search; Settings; Cinema Film; Foundations; Controls.
**Status (2026-11-10): the layouts were rejected, the decisions stand.** The owner rejected this file's screens and the
"Stage" direction as layouts ("we will just go with what I have now but with improvements and polish"), and Claude then
wrongly shelved the whole file, glass decision included. The owner caught it ("I thought we weren't doing Liquid Glass?
What happened to all your research and decisions?"). What applies to the owner's own design, from 3.26 on: **no glass**
(see "Why no glass"; done in the Launcher's tokens, commit 932d3724), **no small notes**, pure black, white is the
action and green means live, Exo does things instead of telling you, and the renderer needs in `RENDERER-NEEDS.md`.
What does not apply: this file's shell (a new Bar), its sizes, radii and type scale where they differ from the shipping
design, and every screen drawn for it.

**Earlier status: superseded the same day.** The owner judged this "just a polish of the one we have now" and asked for a
bolder, original Launcher design with its own icons and typeface. The direction is now "Stage" (every room opens on its
stage; five rooms; live mini players on the left of the Bar that open into cards; motion as a first-class part of the
design). The canvas holds the current boards; this file keeps v3's reasoning (no glass, no small notes, pure black,
the tokens' intent) until the Stage language is written up. See also `RENDERER-NEEDS.md`.

## The brief (owner, 2026-11-09)

- "A consistent ecosystem feel. Modern, clean, minimal, simple, ease of use, comfortable to look at but stunning
  craftsmanship and perfect UX."
- "amoled black or void is the only thing I want." Liquid Glass is optional: "if you want to not do Liquid Glass fine
  by me. You can choose whatever."
- "One thing I hate that I keep seeing is all these tiny notes everywhere and stuff. The avg user doesn't know nor care
  about this. They just want their stuff to work, stay updated, be the best it can be with everything working
  perfectly together."
- References the owner thinks get it right, for principles only: Apple, Tesla, SpaceX, X, Cursor. "Obv I want our own
  direction."

## In one line

Black is space. Your content is the only light. The interface is quiet, monochrome and the same in every Exo app, and
Exo does things for you instead of telling you about them.

## Six rules

1. **Content is the only colour.** Covers, video and album art carry all the colour. Chrome is black, white and greys.
2. **White is the action. Green means live.** One white primary action per view. Green only for "happening now":
   playing, online, on. Amber means "needs you", red means "wrong". Nothing else is coloured.
3. **A label stands alone. No notes.** No helper captions, hints, version strings, paths, temperatures or
   how-it-works sentences on primary surfaces. If a label needs a sentence, rename it or remove the feature from view.
4. **Space groups. Lines separate. Boxes are rare.** Hierarchy comes from position, size and weight. A hairline
   divides rows. A bordered box is only for something that floats.
5. **One bar, one search, one settings page in every app.** Moving between Exo apps should feel like changing rooms.
6. **Exo does it. It asks only when you would lose something.** Updates, tuning and backups run on their own. The
   whole system reports through one status dot. Text appears only for a decision or a loss, in one plain sentence
   with the action as a button.

## What changed from v2

| | v2 (2026-11-07) | v3 |
|---|---|---|
| Base | `#08090A` | `#000000` everywhere (owner's fixed decision) |
| Glass | none | none (confirmed; reasons below) |
| Shell | left sidebar + top bar | one top Bar: search left, rooms centred, status + account + window buttons right |
| Signature | travelling pill + mono index line | travelling pill + the status dot + content as the only light |
| Mono index line (`02 · Library · 148`) | yes | removed: it is a small note |
| Captions under settings rows and tiles | yes | removed |
| Smallest text | 11 | 12 |
| Buttons | 6 px rectangles | pills (32 high; 44 for the one big action) |
| Radii | 4 / 6 / 8 / 12 / pill | 6 / 10 / 14 / 20 / pill |
| Window gutter | 16 | 24 (16 inside the Bar) |

Kept from v2: opaque two-layer model (content, controls), Geist, the travelling selection pill and its spring,
concentric corners, the 4 px grid, the three durations, one Ctrl+K palette across apps, Continue anywhere, one
Settings layout, Tabler icons, the 2 px focus ring.

**Why no glass.** The shipped glass sheets pick up blobs of colour from the art behind them; the Launcher's own docs
record dropped frames while scrolling under glass; Apple restricts its glass to controls and added an opacity toggle
after legibility complaints; Microsoft calls blur GPU-intensive and says not to use it on large or long-lived
surfaces. Opaque floats are faster, clearer and simpler to render, and let the fork drop a carried renderer patch.

## Tokens

**Colour**

| Token | Value | Use |
|---|---|---|
| void | `#000000` | every page |
| raised | `#0A0A0A` | rare wells, art placeholders |
| float | `#131313` | menus, the palette, notices, sheets; always with the float line |
| line | white 8% | row dividers on void |
| float-line | white 10% | 1 px border of anything floating |
| hover / selected / pressed | white 8% / 10% / 14% | fills; never a border |
| text | `#EDEDED` | primary (off-white: pure white on pure black is harsh) |
| quiet | `#A1A1A1` | secondary (8.2:1 on void) |
| faint | `#808080` | tertiary; never for words that must be read (5.3:1 on void) |
| action | `#EDEDED` on `#000` text | the one primary button; hover `#FFFFFF`, pressed `#CFCFCF` |
| live | `#3DD68C` | playing, online, on |
| needs-you | `#FFB340` | a decision is waiting |
| wrong | `#FF5C5C` | failure, destructive |

Art over which text sits gets a black scrim reaching at least 80% at the text. One ambient wash is allowed per page:
the hero art's cached colour at no more than about 20% in the top 440 px, static, dithered (see renderer needs).

**Type.** Geist. Sizes 12, 13, 15, 17, 20, 28, 48. Weights 400 (reading), 500 (controls, names), 600 (titles, buttons).
Tracking −0.02 em at 28 and 48, −0.01 em at 20, 0 below. Sentence case. No uppercase, no mono, nothing under 12.

| Role | Size / line | Weight |
|---|---|---|
| Display (a title page, a hero) | 48 / 52 | 600 |
| Page | 28 / 32 | 600 |
| Title (a section) | 20 / 26 | 600 |
| Lead (an issue, a synopsis) | 17 / 24–26 | 500 or 400 |
| Reading (settings rows, list names) | 15 / 22 | 400 or 500 |
| Control | 13 / 18 | 500; buttons 600 |
| Small (a fact's label) | 12 / 16 | 400 |

**Space** 4, 8, 12, 16, 24, 32, 48, 64. **Radii** 6 (small), 10 (controls, fields), 14 (art, menus), 20 (hero art,
the palette), pill (buttons, selection, avatars, switches). Inner radius = outer radius − padding.
**Sizes** Bar 56; controls 32; the big action 44; settings rows 56; palette rows 48; menu rows 36; switch 40×24;
slider track 4 with a 16 knob; hit area never under 32.

**Motion** press 120 ms, open 180 ms, arrive 280 ms, all ease-out; the selection pill glides on a spring (stiffness
260, damping 0.725). Containers animate, not their contents. Nothing moves at rest. Reduce motion: fades only.

**Depth** (no shadows, no blur): content sits on void; what floats is `float` with a hairline; when something floats
modally, what is behind dims to about 30% and scales to 0.985.

## The shell (every app)

- **Bar, 56 high:** back (inside a title page) and Search on the left; the app's rooms centred as plain words with the
  travelling pill; on the right the status dot, the account, a hairline, then Windows-style window buttons.
  Launcher rooms: Library, Store, Discord, Music, PC, Devices. Cinema: Home, Films, Shows, Library.
- **Search (Ctrl+K):** one palette for everything in every Exo app, grouped by app, plus things Exo can do
  ("Record Hollow Reach"). No key-hint footer.
- **The status dot:** green dot alone when all is well; a pill with a spinner and one word while Exo works
  ("Updating"); an amber pill when something needs you ("2 need you"). It opens the list. This replaces update
  sheets, banners and status paragraphs.
- **Title page (one pattern for a game, a film, an album):** full-bleed art fading to black, the name at 48, the one
  white action, at most four facts (value at 20 over a 12 label), then content rows.
- **Settings:** a full page; sections on the left with the pill; rows of label and control only, divided by hairlines.
- **Asking:** in place, one short question with the action named ("Uninstall Hollow Reach?" Uninstall / Keep).
- **Notice:** a floating pill with a dot, three words and at most one button.

## Words

- One status, not many notes. "Everything else is up to date", not a list of versions.
- A problem is one line plus its button: "Drive D is failing" → Back up now.
- Detail lives one deliberate click away, never more than two levels deep.
- Keep text where the user decides or loses something (replace data, uninstall, risk a ban, what is sent). One plain
  sentence.
- Don't hide frequent actions in menus in the name of minimalism.

## What the renderer (exo-gpui) must provide

- No backdrop blur needed by this language. The fork's blur primitive can stay for special cases but nothing here
  depends on it.
- A dithered two-stop gradient (for scrims over art and the ambient wash): large dark gradients band on 8-bit and
  OLED panels.
- Greyscale text smoothing (ClearType fringes on WOLED/QD-OLED subpixel layouts).
- Rounded clips for art at 14 and 20; continuous (squircle) corners would be a later refinement.
- Paint-only translate/scale/opacity for the pill, pushes and the dim-and-step-back (hit testing stays put).
- Hairlines snapped to one physical pixel at every scale.

## Review checklist (check on a screenshot)

1. Background is `#000`; no grey panels; nothing blurred.
2. At most one white-filled button per view.
3. Green appears only on something live or on.
4. No sentence under any control on a primary surface; no text smaller than 12.
5. No version numbers, paths, temperatures or counts of internal things on a primary surface.
6. Body text is `#EDEDED`, not `#FFFFFF`; only three text greys.
7. Floating things: `#131313`, 1 px white-10% border, no shadow; never one float on another.
8. Corners nest (inner = outer − padding) and come only from 6 / 10 / 14 / 20 / pill.
9. Every interactive thing is at least 32 px in its smaller dimension.
10. Text over art sits on a scrim; contrast at least 4.5:1.
11. Focus is a 2 px `#EDEDED` ring at 2 px offset, on everything focusable.
12. The Bar is identical across apps except for the room names.
13. A warning is one line with its action as a button.
14. Nothing animates at rest; nothing takes longer than 280 ms.
15. Frequent actions are visible, not in an overflow menu.

## Open

- The owner has not yet seen or approved the canvas.
- Discord, Music, Store, Devices, Captures, onboarding and Browser are not drawn yet.
- Cover tiles show art only, the name on hover or focus; tiles without art need a designed plate.
- `tokens/tokens.json`, `exo-design` (Rust) and the web tokens still hold the Void + Liquid Glass values.
- Whether the shipping React Launcher adopts any of this before the GPUI port ships (the notes clean-up at least:
  `misc/notes-inventory-2026-11-09.md`).
