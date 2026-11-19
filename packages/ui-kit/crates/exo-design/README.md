# exo-design

Exo's look for GPUI, for Exo Launcher, Exo Cinema and Exo Browser. It depends on gpui and on nothing of any app. `DESIGN.md` in the Launcher repo is the brief; values follow `ui/src/tokens.css` there.

```rust
Application::new().with_assets(exo_design::Assets).run(|cx| {
    exo_design::init(cx); // Geist, the text field's keys
    // ...
    div().font_family(exo_design::FONT).bg(t::VOID)
        .child(capsule().child(tab("library", "Library", icon::LIBRARY, true)))
});
```

| File | What |
| --- | --- |
| `tokens.rs` | Colors, gaps, radii, the type scale, durations, the four glass tones |
| `glass.rs` | `glass(tone, radius)`: live backdrop blur under one even line |
| `controls.rs` | Icon, label, button, icon button, Bar capsule and tab, divider, switch, slider, menu, sheet, the Exo mark |
| `text_field.rs` | One line of text with caret, selection, clipboard and IME (the core is gpui's `examples/input.rs`) |
| `scroll.rs` | `SmoothScroll`: a wheel that glides and asks for frames only while it moves |
| `motion.rs` | `Motion`: tweens by key on DESIGN.md's curves, asking for frames only while one moves; `PRESSED` is the 0.97 give-way |
| `icons_gen.rs` | Generated: see below |

`cargo run --release -p exo-design --example gallery` shows every piece over a loud backdrop.

## Using it from another repo

Glass needs a primitive plain gpui does not have, so the app takes the kit's patched copy. The path form and the git form are in the kit's `README.md`; the app's root `Cargo.toml` carries the `[patch.crates-io]` line.

## Icons

Tabler, newest release, named by the web UI's own map, so one map names every glyph in both UIs:

```
cd tools && npm ci && node gen-icons.mjs <map.mjs> [--check]
```

The map is required; Exo's is `ui/scripts/tabler-map.mjs` in the Launcher repo. The output, `src/icons_gen.rs`, is committed, so building the crate needs neither Node nor the map. The tool's `--check` fails when it is out of date. A new Tabler release: bump `@tabler/icons` in `tools/package.json` (`npm view @tabler/icons version`) and run it.

## Fonts

Geist 1.9.1's static cuts from the `geist` npm package (Light to Bold), SIL OFL (`assets/fonts/LICENSE-Geist.txt`), built in.

## Known gaps against the web controls

gpui has no transform for a whole subtree, so a press gives way by shrinking a box about its middle (`relative` insets from a `Motion` value), and its words do not scale. Hover is instant (no 120 ms ease yet). Menus and sheets have no focus trap or arrow keys yet; Escape is the view's. No letter-spacing, which DESIGN.md does not want anyway except Geist's own. Glass on glass is avoided (`ButtonKind::OnGlass`).
