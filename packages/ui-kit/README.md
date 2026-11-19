# exo-ui-kit

Exo's native UI building blocks on GPUI, for the apps that share one look: Exo Launcher, Exo Cinema and Exo Browser. It holds no app code. Each app keeps its own rooms, data and host, and depends on this repo for the look, the test surface and the patched GPUI underneath.

Nothing here is published. Windows is the target; other backends do not draw the patched glass primitive.

## What is in it

| Path | What |
| --- | --- |
| `crates/exo-design` | Exo's look: tokens (colors, gaps, radii, type scale, durations, glass tones), Geist, Tabler icons (generated), Liquid Glass (`glass`), controls (icon, label, button, Bar capsule and tab, switch, slider, menu, sheet, the Exo mark), a one-line text field (`TextField::password` masks it for screen readers), smooth scrolling and tweens. `examples/gallery.rs` shows every piece. |
| `crates/exo-inspect` | What each GPUI element is (role, name, state, bounds): `Inspect::button(id, name)` and friends (`Inspect::password` for a secret input), a semantic tree per painted frame, a UI Automation bridge for Narrator and Inspect (Windows), and an in-app test server (feature `testkit`, off in a shipped build). The server takes an app's own test methods through `extend`. |
| `vendor/gpui` | GPUI 0.2.2 from crates.io with Exo's patches. Every change and its reason is in `vendor/gpui/PATCHES.md`. Apache-2.0; `LICENSE-APACHE` is kept. |
| `tools/gen-icons.mjs` | Generates `crates/exo-design/src/icons_gen.rs` from an app's icon map (`node gen-icons.mjs <map.mjs> [--check]`). The output is committed, so building needs neither Node nor the map. |
| `tools/uia-dump.ps1` | Reads a window's UI Automation tree as JSON, and can press one element by name. Reads only. |
| `tools/measure.ps1` | Idle CPU, memory and GPU memory of named processes, read from outside. `-Names` picks the processes. |
| `tools/ui-test/run.mjs` | Drives an app's in-app test server by element. It still assumes Launcher's exe (`target/testkit/release/exo-ui.exe`) and suite `library` by default, and loads suites by name from its own folder. Generalising it is a follow-up. |
| `tools/ui-test/capture.ps1` | A picture of a window by process id, from outside the app (PrintWindow). |
| `examples/hello-exo` | A small app that uses only this kit: one window, a glass panel, a button and a text field. |

## How an app depends on it

Take the kit as a sibling checkout and point at its crate and its patched GPUI. The `[patch.crates-io]` must sit in the app's root `Cargo.toml`, because Cargo ignores patches in dependencies:

```toml
[dependencies]
exo-design = { path = "../exo-ui-kit/crates/exo-design" }
exo-inspect = { path = "../exo-ui-kit/crates/exo-inspect", optional = true }  # only for test builds
gpui = "=0.2.2"

[patch.crates-io]
gpui = { path = "../exo-ui-kit/vendor/gpui" }
```

The app's root `Cargo.toml` (its own workspace, or a workspace that does not include the kit) carries the patch. `examples/hello-exo/Cargo.toml` is a working copy of this setup, and the one path this kit verifies.

A git dependency on the kit works the same way, with `git = "<kit remote>"` and a `rev` in place of `path`. That form is not tested here yet; use the path form until it is.

GPUI must stay `=0.2.2` while the vendored copy is 0.2.2. Newer GPUI needs the patches in `PATCHES.md` carried across by hand.

## Build and test

From the kit root:

```
cargo build                                  workspace: exo-design, exo-inspect
cargo test                                   the same crates' unit tests
cargo build -p exo-design --example gallery  the gallery, built not run
```

Run the gallery with `cargo run --release -p exo-design --example gallery` when you want to see the pieces.

`examples/hello-exo` is excluded from the workspace and builds as its own app, the way an app repo would: `cd examples/hello-exo && CARGO_TARGET_DIR=../../target cargo build`. The `CARGO_TARGET_DIR` reuses the kit's compiled gpui; without it the app compiles gpui again into its own `target/`. Its `Cargo.lock` is the kit's, so both build the same versions.

## What stays in the app repos

The kit holds the parts that name no app. Exo Launcher keeps, in its own repo:

- Its rooms and their data: Library types, shelves, covers, sorting, folders, the game sheet, Store, Discord, Music, PC and Devices. They lived in the `exo-ui` crate, which the kit no longer has.
- Its host: the RPC names, the fake host used by test suites, and the host events.
- Its test suites (`library`, `a11y`, `fake-*`), their fixtures and the web measure. `test-instance.ps1` starts Launcher with its own data dir, so it stays there too.
- Its icon map (`ui/scripts/tabler-map.mjs`). `gen-icons.mjs` takes the map as an argument, so another app passes its own.

Nothing in `exo-design` or `exo-inspect` code needed moving out. Launcher's name appears only in comments and in the README's pointers to Launcher's `DESIGN.md` and `tokens.css`.

Extension points for an app: `exo_inspect::extend` for its test methods, and the icon map argument. A new app adds its own `Inspect` calls and its own glyph map.

## History

The kit's history is `native/` from Exo's `port/gpui` branch, extracted with `git filter-branch --subdirectory-filter native`. The extraction used exo-port at commit `6f0acad0c45336a87679646c9728905eed5b03de`: 27 commits, the first being `vendor gpui 0.2.2 unmodified`. The kit's copy of that tip is `9786053`. Hashes differ from exo-port's because the paths moved. The first removal commit (`ffb2bc3`) drops Launcher-only code from this history; earlier commits still contain it.

## Licenses

See `LICENSES.md`. GPUI is Apache-2.0. Geist is SIL OFL 1.1. Tabler icons are MIT. The kit's own code has no license yet.
