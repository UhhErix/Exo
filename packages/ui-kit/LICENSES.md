# Licenses

## This repo's own code

Exo's own code is under the [MIT license](../../LICENSE).

## Third-party components

| Component | Where it is | License | Notice file |
| --- | --- | --- | --- |
| GPUI 0.2.2 (Zed Industries), with Exo's patches (`vendor/gpui/PATCHES.md`) | `vendor/gpui` | Apache-2.0 | `vendor/gpui/LICENSE-APACHE` (kept) |
| Geist 1.9.1 (Vercel, in collaboration with basement.studio) | `crates/exo-design/assets/fonts` | SIL Open Font License 1.1 | `crates/exo-design/assets/fonts/LICENSE-Geist.txt` |
| Tabler Icons 3.50.0 (Paweł Kuna); glyph paths generated into `crates/exo-design/src/icons_gen.rs` | `crates/exo-design`, `tools/package.json` | MIT | `crates/exo-design/LICENSE-Tabler.txt` |
| Rust crates (anyhow, serde, serde_json, accesskit, windows, and the rest) | resolved in `Cargo.lock` | each crate's own | each crate's package |

GPUI is modified. Apache-2.0 asks that changes be noted, and `vendor/gpui/PATCHES.md` lists each one.
