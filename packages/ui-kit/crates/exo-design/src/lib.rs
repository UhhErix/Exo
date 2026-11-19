//! Exo's look for GPUI, shared by Exo Launcher, Exo Cinema and Exo Browser. It knows nothing of any of them: no host, no rooms.
//!
//! `exo_design::init(cx)` loads Geist and the theme's key bindings; `Assets` serves the Tabler icons. The tokens are
//! DESIGN.md's. Glass needs the patched gpui in the kit's `vendor/gpui` (see the crate's README).

pub mod controls;
pub mod glass;
#[path = "icons_gen.rs"]
pub mod icon;
pub mod motion;
pub mod scroll;
pub mod text_field;
pub mod tokens;

use gpui::{App, AssetSource, Result, SharedString};
use std::borrow::Cow;

pub use glass::glass;
pub use motion::{Ease, Motion};
pub use scroll::SmoothScroll;
pub use text_field::{Edited, TextField};
pub use tokens as t;

/// Geist, as every Exo window draws it.
pub const FONT: &str = "Geist";

/// The icon table, as gpui's asset source. An app with assets of its own wraps this one.
pub struct Assets;

impl AssetSource for Assets {
    fn load(&self, path: &str) -> Result<Option<Cow<'static, [u8]>>> {
        // A plain search: the generated table is in the web map's order, not byte order (`eye-off` before `eye` broke a
        // binary search, and Hide, Open folder and Folder drew no glyph). gpui caches what it loads.
        Ok(icon::ALL.iter().find(|(name, _)| *name == path).map(|(_, svg)| Cow::Borrowed(svg.as_bytes())))
    }

    fn list(&self, path: &str) -> Result<Vec<SharedString>> {
        Ok(icon::ALL
            .iter()
            .filter(|(name, _)| name.starts_with(path))
            .map(|(name, _)| SharedString::from(*name))
            .collect())
    }
}

/// Call once, before opening a window. Geist comes from Vercel's static cuts: DirectWrite does not pick a weight off a
/// variable font's axis in gpui.
pub fn init(cx: &mut App) {
    cx.text_system()
        .add_fonts(vec![
            Cow::Borrowed(include_bytes!("../assets/fonts/Geist-Light.ttf").as_slice()),
            Cow::Borrowed(include_bytes!("../assets/fonts/Geist-Regular.ttf").as_slice()),
            Cow::Borrowed(include_bytes!("../assets/fonts/Geist-Medium.ttf").as_slice()),
            Cow::Borrowed(include_bytes!("../assets/fonts/Geist-SemiBold.ttf").as_slice()),
            Cow::Borrowed(include_bytes!("../assets/fonts/Geist-Bold.ttf").as_slice()),
        ])
        .expect("Geist is built in");
    text_field::bind_keys(cx);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_glyph_loads() {
        for (name, _) in icon::ALL {
            assert!(Assets.load(name).unwrap().is_some(), "{name}");
        }
    }
}
