# What the Launcher redesign needs from exo-gpui

> **Status (2026-11-10).** The "Stage" layouts this file names were rejected; the owner's shipping design stays, improved.
> The renderer needs below still hold, **including no backdrop blur**: the Launcher is solid from 3.26 (no Liquid Glass;
> a note written here on 2026-11-09 said the opposite and was wrong). Where a line names a Stage screen (the stage
> cross-fade, the reel), read it as the shipping design's own equivalent (a hero or Continue card, the cover grid).

Written 2026-11-09 by Claude (main session). The owner's instruction: the new design is what the GPUI port will be
built in, so the fork should be optimized for exactly what the design uses, and not carry cost for what it doesn't.
The design ("Stage": every room opens on its stage) is on the private canvas "Exo Design Language" and, once approved,
will be written up in this repo. This file is the contract between that design and `Exo\exo-gpui`.

## The design uses these, constantly — they must be fast at 60–240 Hz and look perfect

1. **Full-bleed images with rounded clips.** A stage image the size of the window, covers in reels and walls
   (radius 14–20), avatars (circles). Cross-fade between two window-sized images when the focused game changes, with a
   small parallax translate. No frame may drop during the cross-fade.
2. **Two-stop linear gradients as scrims over art** (left-to-right and top-to-bottom, black at 0–80%). They are large
   and dark, so they must be **dithered**; banding on 8-bit and OLED panels is otherwise visible.
3. **Solid rounded rectangles**: pills, circles, radii 10/14/16/20/24. Hairlines exactly one physical pixel at every
   scale. One 2 px focus ring that travels.
4. **Text.** Large light titles (48–92 px, weight 300) and small labels (12–17 px, weight 400–500) in Exo's own
   typeface (working name Exoline; a stand-in until it passes review). Greyscale anti-aliasing (ClearType fringes on
   OLED), sub-pixel positioning, correct kerning. Glyphs above about 64 px should be drawn as paths or from a separate
   large-glyph cache so the atlas doesn't bloat.
5. **Vector icons** from Exo's own set: 24-grid, 1.5 stroke, flat ends, round joins, at 16–24 px, crisp at 1×.
   Some icons **morph** (play ↔ pause, mic ↔ muted with a drawn slash, dot → spinner → drawn check, heart fill):
   this needs an animated-path element, not a swap of two bitmaps.
6. **Springs on transform, opacity and one rectangle's size.** The selection pill glides between rooms; the focused
   cover grows; a mini player grows into the Bar; a mini player **morphs into its card** (one rounded rectangle whose
   width, height and radius animate on a single spring while its contents cross-fade); the Play pill flies into the
   Bar as a shared element; rooms change with a 12 px drift and fade. All of this must run **without re-running layout
   or re-rendering views**: paint-only translate/scale/opacity on retained elements, driven on the frame clock,
   interruptible mid-flight.
7. **Thin progress lines and rings** (2 px line along a capsule's edge; an arc around a small round art).
8. **Virtualized reels and walls of images** with momentum scrolling, per-item focus scale, and a fade at the reel's
   edge (a one-axis alpha mask or a scrim).
9. **Video and shared-texture surfaces** (clips, Discord calls, screen share) inside rounded tiles and inside scrolling
   content. (Shared textures: done on `exo/next`.)
10. **An image pipeline with a memory budget**: decode off the main thread to the displayed size, keep one GPU copy,
    release the CPU copy, evict by budget. (The benchmark measured about 400 MB for about 100 MB of cover pixels.)
11. **WebView child windows above native content** for store sign-in, the music engines and payment pages.
12. **Nothing at rest.** Zero frames and zero wake-ups when nothing moves; each window paced to its own monitor.

## The design does not use these — don't optimize for them, keep them out of hot paths

- Backdrop blur / glass of any kind (the previous language's main cost). The fork's blur primitive can stay in the
  tree behind a flag for other apps, but nothing in the Launcher should link it into the default frame path.
- Box shadows, glows, text shadows.
- Multi-stop, radial or conic gradients (rings are path arcs; washes are two-stop).
- Grain, lens/refraction, blur filters, layer effects.
- Light or dark themes, glass toggles: one palette, pure black.

So from the fork survey (`misc\exo-gpui-forks-2026-11-09.md`): the liquid-glass lens, better-blur work, outside-clipped
shadows and radial/conic gradients are **dropped**. Paint-only transforms, the IME fix, per-monitor pacing, animated
images and the streaming-texture backend stay; edge-fade masks stay in the cheap one-axis form.

## Work order this implies for the fork (after the current merge and pacing work lands)

1. Paint-only transforms and opacity on retained elements, plus a spring/tween driver on the frame clock (the base of
   every motion above). Then the rectangle morph (animated size and radius) and shared-element flights.
2. Image pipeline memory: decode-to-size, single GPU copy, budgeted cache; cross-fade of two large images.
3. Dithered two-stop gradients.
4. Animated vector paths for icons; make icons a first-class element fed from the Exo icon set.
5. Large-glyph rendering and greyscale smoothing; ship Exoline when it passes.
6. A build of the Launcher UI with the blur path compiled out; measure the saving.

## Benchmarks to add to exo-bench so each of these is a number

Stage cross-fade while the reel scrolls; reel focus travel (cover scale plus ring glide); a mini player growing into
the Bar and morphing into its card; a room change; the Play flight; idle with a song "playing" (only the progress
line may draw, and at a low rate). Each records frame intervals against the monitor's refresh, CPU, and memory.
