//! Liquid Glass (DESIGN.md › Glass): what is behind, blurred and toned, under a fill, inside one even line.

use crate::t::{self, GlassTone};
use gpui::{
    App, Bounds, Corners, Div, Pixels, Rgba, Window, canvas, div, point, prelude::*, px,
};

/// A surface of the given glass with its rim. Children paint over the glass.
pub fn glass(tone: GlassTone, radius: f32) -> Div {
    div()
        .relative()
        .rounded(px(radius))
        .child(backing(tone, radius, None))
        .border_1()
        .border_color(t::RIM)
}

/// The glass alone, filling a parent with a 1px border (absolute children sit inside a border).
pub fn backing(tone: GlassTone, radius: f32, fill: Option<Rgba>) -> impl IntoElement {
    canvas(
        |_, _, _| {},
        move |bounds: Bounds<Pixels>, _, window: &mut Window, _: &mut App| {
            window.paint_backdrop_blur(
                bounds,
                Corners::all(px(radius)),
                px(tone.blur),
                tone.brightness,
                tone.contrast,
                tone.saturation,
                fill.unwrap_or(tone.tint),
            );
        },
    )
    .absolute()
    .top(px(-1.0))
    .left(px(-1.0))
    .right(px(-1.0))
    .bottom(px(-1.0))
}

/// The drop shadow of large glass (`--glassy-shadow-raised`).
pub fn raised_shadow() -> Vec<gpui::BoxShadow> {
    vec![gpui::BoxShadow {
        color: t::SHADOW_RAISED.into(),
        offset: point(px(0.0), px(0.0)),
        blur_radius: px(40.0),
        spread_radius: px(0.0),
    }]
}
