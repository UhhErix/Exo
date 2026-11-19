//! DESIGN.md's tokens, values from `ui/src/tokens.css` and `glass.css` (the code is the source of truth there too).

use gpui::Rgba;
use std::time::Duration;

const fn hex(value: u32) -> Rgba {
    Rgba {
        r: ((value >> 16) & 0xff) as f32 / 255.0,
        g: ((value >> 8) & 0xff) as f32 / 255.0,
        b: (value & 0xff) as f32 / 255.0,
        a: 1.0,
    }
}

const fn ink(alpha: f32) -> Rgba {
    Rgba { r: 1.0, g: 1.0, b: 1.0, a: alpha }
}

const fn black(alpha: f32) -> Rgba {
    Rgba { r: 0.0, g: 0.0, b: 0.0, a: alpha }
}

pub const VOID: Rgba = hex(0x000000);
pub const FG: Rgba = hex(0xffffff);
pub const MUTED: Rgba = hex(0xb4b4b4);
pub const FAINT: Rgba = hex(0x9a9a9a);
pub const LINE: Rgba = hex(0x222222);
pub const LINE_SOFT: Rgba = hex(0x161616);
pub const HAIRLINE: Rgba = hex(0x1f1f1f);
pub const CONTROL_LINE: Rgba = hex(0x2a2a2a);
pub const TILE: Rgba = hex(0x121212);
pub const SOLID: Rgba = hex(0x121212);
pub const GOOD: Rgba = hex(0x3dd68c);
pub const WARN: Rgba = hex(0xffb340);
pub const BAD: Rgba = hex(0xff5c5c);
pub const PRIMARY: Rgba = hex(0xffffff);
pub const PRIMARY_FG: Rgba = hex(0x000000);
pub const PRIMARY_HOVER: Rgba = hex(0xe8e8e8);

/// On the page.
pub const HOVER: Rgba = ink(0.10);
pub const PRESSED: Rgba = ink(0.133);
pub const SELECTED: Rgba = ink(0.15);
pub const TRACK: Rgba = ink(0.17);
pub const SCRIM: Rgba = black(0.6);

/// The one even line around glass, inside its edge (`--glassy-ring`).
pub const RIM: Rgba = ink(0.14);
pub const RIM_PRESSED: Rgba = ink(0.08);

/// On small glass (`.exo-glass`).
pub const GLASS_SECONDARY: Rgba = hex(0xe4e4e4);
pub const GLASS_HOVER: Rgba = ink(0.06);
pub const GLASS_SELECTED: Rgba = ink(0.07);
pub const GLASS_PRESSED: Rgba = ink(0.12);

/// On large glass (`.exo-glass.is-panel`).
pub const PANEL_SECONDARY: Rgba = hex(0xdcdcdc);
pub const PANEL_HOVER: Rgba = ink(0.07);
pub const PANEL_SELECTED: Rgba = ink(0.10);
pub const PANEL_PRESSED: Rgba = ink(0.14);
pub const PANEL_OVERLAY: Rgba = black(0.36);

pub const SHADOW_RAISED: Rgba = black(0.5);

/// Window inset, and the gap between floating things.
pub const GAP: f32 = 10.0;
pub const BAR_HEIGHT: f32 = 36.0;
pub const CARD_RADIUS: f32 = 14.0;
pub const PANEL_RADIUS: f32 = 18.0;
pub const SHEET_RADIUS: f32 = 24.0;
pub const ROW_RADIUS: f32 = 8.0;
pub const PILL: f32 = 999.0;
pub const MENU_ROW: f32 = 38.0;
pub const MENU_WIDTH: f32 = 240.0;
pub const BUTTON: f32 = 32.0;
pub const BUTTON_COMPACT: f32 = 28.0;

/// The type scale: 20 titles, 13 body and controls, 12 small; 28 and 32 for the page titles DESIGN.md names.
pub const TEXT_TITLE: f32 = 20.0;
pub const TEXT_BODY: f32 = 13.0;
pub const TEXT_SMALL: f32 = 12.0;
pub const TEXT_PAGE: f32 = 28.0;
pub const TEXT_FIRST_RUN: f32 = 32.0;

/// `--dur-press`: a press giving way.
pub const PRESS: Duration = Duration::from_millis(90);
pub const QUICK: Duration = Duration::from_millis(120);
pub const BASE: Duration = Duration::from_millis(160);
pub const MOVE: Duration = Duration::from_millis(220);
/// `--dur-flight`: art flying to a new place.
pub const FLIGHT: Duration = Duration::from_millis(300);
/// `--dur-hold`: a notice stays this long.
pub const HOLD: Duration = Duration::from_millis(3000);

/// Small glass: `--exo-control-glass`, clear (`--exo-fill`).
pub const SMALL_GLASS: GlassTone = GlassTone { blur: 10.0, brightness: 0.62, contrast: 1.0, saturation: 1.8, tint: black(0.0) };
/// Large glass: sheets, menus, popovers, dialogs (the overlay over a thicker blur).
pub const LARGE_GLASS: GlassTone = GlassTone { blur: 20.0, brightness: 0.66, contrast: 1.0, saturation: 1.8, tint: PANEL_OVERLAY };
/// A menu's glass, as the shipped page computes it: `blur(16px) saturate(1.8) brightness(0.66)` under `rgba(0,0,0,.36)`.
pub const MENU_GLASS: GlassTone = GlassTone { blur: 16.0, brightness: 0.66, contrast: 1.0, saturation: 1.8, tint: PANEL_OVERLAY };
/// A plate of words over art (`.exo-continue-text`, a cover's plate): the art held down further, so words stay readable.
pub const PLATE_GLASS: GlassTone = GlassTone { blur: 10.0, brightness: 0.34, contrast: 0.9, saturation: 1.6, tint: black(0.0) };
/// A pane's glass: a room's side panel.
pub const PANE_GLASS: GlassTone = GlassTone { blur: 14.0, brightness: 0.62, contrast: 1.0, saturation: 1.8, tint: black(0.0) };

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GlassTone {
    pub blur: f32,
    pub brightness: f32,
    pub contrast: f32,
    pub saturation: f32,
    pub tint: Rgba,
}
