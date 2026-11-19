//! Exo's controls (DESIGN.md › Grammar): stateless builders. State belongs to the view; a control gets its value and a
//! callback. Each returns a gpui element, so the caller adds what is left (`.on_click`, a size, a `tooltip`).

use crate::glass::{glass, raised_shadow};
use crate::t;
use gpui::{
    AnyElement, App, Bounds, ClickEvent, CursorStyle, ElementId, FontWeight, Hsla, MouseButton, MouseDownEvent, Pixels,
    SharedString, Stateful, Window, canvas, div, point, prelude::*, px, relative, svg,
};

/// A Tabler glyph in the given color.
pub fn icon(path: &'static str, size: f32, color: impl Into<Hsla>) -> impl IntoElement {
    svg().path(path).size(px(size)).flex_none().text_color(color)
}

/// Words on the type scale. Controls are 13 Medium, section names 20 SemiBold.
pub fn label(text: impl Into<SharedString>, size: f32, weight: FontWeight, color: impl Into<Hsla>) -> gpui::Div {
    div().text_size(px(size)).font_weight(weight).text_color(color).child(text.into())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ButtonKind {
    Primary,
    /// On the page: a fill of glass inside the rim.
    Raised,
    Quiet,
    Danger,
    /// A raised button already on glass (a sheet, a menu, Select mode's bar): the rim and the glass's own lifts, no glass
    /// of its own (DESIGN.md: never glass on glass).
    OnGlass,
}

/// `.exo-set-btn`: 32px, 13px Medium.
pub fn button(id: impl Into<ElementId>, text: impl Into<SharedString>, kind: ButtonKind) -> Stateful<gpui::Div> {
    button_with(id, None, text, kind)
}

/// `.exo-set-btn` with a 16px glyph before its words, 12px inside.
pub fn icon_text_button(id: impl Into<ElementId>, glyph: &'static str, text: impl Into<SharedString>, kind: ButtonKind) -> Stateful<gpui::Div> {
    button_with(id, Some(glyph), text, kind).px(px(12.0))
}

fn button_with(id: impl Into<ElementId>, glyph: Option<&'static str>, text: impl Into<SharedString>, kind: ButtonKind) -> Stateful<gpui::Div> {
    let base = div().id(id).flex_none();
    let surface = match kind {
        ButtonKind::Primary => base.rounded(px(t::PILL)).bg(t::PRIMARY).text_color(t::PRIMARY_FG).hover(|s| s.bg(t::PRIMARY_HOVER)),
        ButtonKind::Quiet => base
            .rounded(px(t::PILL))
            .text_color(t::FG)
            .hover(|s| s.bg(t::HOVER))
            .active(|s| s.bg(t::PRESSED)),
        ButtonKind::OnGlass => base
            .rounded(px(t::PILL))
            .border_1()
            .border_color(t::RIM)
            .text_color(t::FG)
            .hover(|s| s.bg(t::PANEL_HOVER))
            .active(|s| s.bg(t::PANEL_PRESSED).border_color(t::RIM_PRESSED)),
        ButtonKind::Raised | ButtonKind::Danger => base
            .relative()
            .rounded(px(t::PILL))
            .child(crate::glass::backing(t::SMALL_GLASS, t::PILL, None))
            .border_1()
            .border_color(t::RIM)
            .text_color(if kind == ButtonKind::Danger { t::BAD } else { t::FG })
            .hover(|s| s.bg(t::GLASS_HOVER))
            .active(|s| s.bg(t::GLASS_PRESSED).border_color(t::RIM_PRESSED)),
    };
    surface
        .h(px(t::BUTTON))
        .px(px(14.0))
        .flex()
        .items_center()
        .justify_center()
        .gap(px(6.0))
        .cursor(CursorStyle::PointingHand)
        .text_size(px(t::TEXT_BODY))
        .font_weight(FontWeight::MEDIUM)
        .when_some(glyph, |b, glyph| {
            let ink = match kind {
                ButtonKind::Primary => t::PRIMARY_FG,
                ButtonKind::Danger => t::BAD,
                _ => t::FG,
            };
            b.child(icon(glyph, 16.0, ink))
        })
        .child(text.into())
}

/// A quiet icon button, the Bar's size: 34 by 30.
pub fn icon_button(id: impl Into<ElementId>, path: &'static str, on: bool) -> Stateful<gpui::Div> {
    div()
        .id(id)
        .flex()
        .flex_none()
        .items_center()
        .justify_center()
        .w(px(34.0))
        .h(px(30.0))
        .rounded(px(t::PILL))
        .when(on, |s| s.bg(t::GLASS_SELECTED))
        .hover(|s| s.bg(t::GLASS_HOVER))
        .active(|s| s.bg(t::GLASS_PRESSED))
        .child(icon(path, 16.0, t::GLASS_SECONDARY))
}

/// A Bar capsule: 36px of small glass with a pill's corners.
pub fn capsule() -> gpui::Div {
    glass(t::SMALL_GLASS, t::PILL).h(px(t::BAR_HEIGHT)).flex().flex_none().items_center()
}

/// `.exo-nav-btn`: a room's tab.
pub fn tab(
    id: impl Into<ElementId>,
    text: impl Into<SharedString>,
    path: &'static str,
    current: bool,
) -> Stateful<gpui::Div> {
    div()
        .id(id)
        .flex()
        .flex_none()
        .items_center()
        .gap(px(6.0))
        .h(px(30.0))
        .px(px(11.0))
        .rounded(px(t::PILL))
        .text_size(px(t::TEXT_BODY))
        .font_weight(FontWeight::SEMIBOLD)
        .text_color(t::FG)
        .when(current, |s| s.bg(t::GLASS_SELECTED))
        .when(!current, |s| s.hover(|s| s.bg(t::GLASS_HOVER)))
        .active(|s| s.bg(t::GLASS_PRESSED))
        .child(icon(path, 16.0, t::FG))
        .child(text.into())
}

/// The 1px line between things on a capsule.
pub fn divider() -> impl IntoElement {
    div().flex_none().w(px(1.0)).h(px(16.0)).mx(px(3.0)).bg(t::GLASS_SELECTED)
}

/// `components/Switch.tsx`: 40 by 24, a round white knob, gray off, green on.
pub fn switch(
    id: impl Into<ElementId>,
    on: bool,
    changed: impl Fn(bool, &mut Window, &mut App) + 'static,
) -> Stateful<gpui::Div> {
    div()
        .id(id)
        .flex_none()
        .relative()
        .w(px(40.0))
        .h(px(24.0))
        .rounded(px(t::PILL))
        .bg(if on { t::GOOD } else { t::TRACK })
        .cursor(CursorStyle::PointingHand)
        .on_click(move |_: &ClickEvent, window, cx| changed(!on, window, cx))
        .child(
            div()
                .absolute()
                .top(px(2.0))
                .left(px(if on { 18.0 } else { 2.0 }))
                .size(px(20.0))
                .rounded(px(t::PILL))
                .bg(t::FG),
        )
}

/// `components/ui/Slider.tsx`: a 4px track, filled white up to the value, and a 14px white knob. `changed` gets 0 to 1.
pub fn slider(
    id: impl Into<ElementId>,
    value: f32,
    changed: impl Fn(f32, &mut Window, &mut App) + Clone + 'static,
) -> Stateful<gpui::Div> {
    let value = value.clamp(0.0, 1.0);
    let down = changed.clone();
    // The view's bounds from this frame's paint, for turning a pointer into a value.
    let bounds = std::rc::Rc::new(std::cell::Cell::new(Bounds::<Pixels>::default()));
    let at = {
        let bounds = bounds.clone();
        move |x: Pixels| {
            let b: Bounds<Pixels> = bounds.get();
            if b.size.width > px(0.0) { ((x - b.origin.x) / b.size.width).clamp(0.0, 1.0) } else { 0.0 }
        }
    };
    let at_down = at.clone();
    div()
        .id(id)
        .relative()
        .h(px(20.0))
        .w_full()
        .flex()
        .items_center()
        .cursor(CursorStyle::PointingHand)
        .child(
            canvas(
                move |b, _, _| bounds.set(b),
                |_, _, _, _| {},
            )
            .absolute()
            .size_full(),
        )
        .on_mouse_down(MouseButton::Left, move |event: &MouseDownEvent, window, cx| {
            down(at_down(event.position.x), window, cx);
        })
        .on_mouse_move(move |event, window, cx| {
            if event.pressed_button == Some(MouseButton::Left) {
                changed(at(event.position.x), window, cx);
            }
        })
        .child(
            div()
                .relative()
                .h(px(4.0))
                .w_full()
                .rounded(px(t::PILL))
                .bg(t::TRACK)
                .child(div().absolute().left_0().top_0().h_full().w(relative(value)).rounded(px(t::PILL)).bg(t::FG)),
        )
        .child(
            div()
                .absolute()
                .top(px(3.0))
                .left(relative(value))
                .ml(px(-7.0))
                .size(px(14.0))
                .rounded(px(t::PILL))
                .bg(t::FG),
        )
}

/// A menu (`.exo-menu`, measured off the shipped page): 240 wide, 8px inside, 14px corners, large glass blurred 16px.
/// Its children are `menu_row`s and `menu_heading`s, 2px apart. Position it yourself, over everything else. The rim takes
/// 1px of the 8 inside (the page draws it as an inset shadow, which takes none).
pub fn menu() -> gpui::Div {
    glass(t::MENU_GLASS, t::CARD_RADIUS).w(px(t::MENU_WIDTH)).p(px(7.0)).flex().flex_col().gap(px(2.0)).shadow(raised_shadow())
}

/// A menu row (`.exo-menu-item`): 38px, 12px inside, 8px corners, 13px Medium; a 16px glyph before the words and a check
/// after them on the current choice.
pub fn menu_row(id: impl Into<ElementId>, glyph: Option<&'static str>, text: impl Into<SharedString>, checked: bool) -> Stateful<gpui::Div> {
    div()
        .id(id)
        .flex()
        .flex_none()
        .items_center()
        .gap(px(10.0))
        .h(px(t::MENU_ROW))
        .px(px(12.0))
        .rounded(px(t::ROW_RADIUS))
        .text_size(px(t::TEXT_BODY))
        .font_weight(FontWeight::MEDIUM)
        .text_color(t::FG)
        .cursor(CursorStyle::PointingHand)
        .hover(|s| s.bg(t::PANEL_HOVER))
        .active(|s| s.bg(t::PANEL_PRESSED))
        .when_some(glyph, |row, glyph| row.child(icon(glyph, 16.0, t::FG)))
        .child(div().flex_grow().truncate().child(text.into()))
        .when(checked, |s| s.child(icon(crate::icon::CHECK, 16.0, t::FG)))
}

/// A section's name over its rows (`.exo-menu-section`): 12px SemiBold, the panel's secondary ink. A later section sits
/// 4px further down with 10px over its name.
pub fn menu_heading(text: impl Into<SharedString>, first: bool) -> impl IntoElement {
    label(text, t::TEXT_SMALL, FontWeight::SEMIBOLD, t::PANEL_SECONDARY)
        .flex_none()
        .line_height(px(18.0))
        .px(px(10.0))
        .pt(px(if first { 8.0 } else { 10.0 }))
        .pb(px(4.0))
        .when(!first, |h| h.mt(px(4.0)))
}

/// A sheet: large glass, 24px corners, centered over a dimmed window. `dismiss` is a press on the dimmed part.
pub fn sheet(
    id: impl Into<ElementId>,
    width: f32,
    content: AnyElement,
    dismiss: impl Fn(&mut Window, &mut App) + 'static,
) -> impl IntoElement {
    div()
        .id(id)
        .absolute()
        .top_0()
        .left_0()
        .size_full()
        .flex()
        .items_center()
        .justify_center()
        .bg(t::SCRIM)
        .occlude()
        .on_click(move |_: &ClickEvent, window, cx| dismiss(window, cx))
        .child(
            glass(t::LARGE_GLASS, t::SHEET_RADIUS)
                .id("exo-sheet")
                .w(px(width))
                .p(px(20.0))
                .shadow(raised_shadow())
                .on_click(|_: &ClickEvent, _, cx| cx.stop_propagation())
                .child(content),
        )
}

/// The Exo mark: three skewed bars, as `brand/ExoMark.tsx` draws it.
pub fn exo_mark(size_px: f32, color: impl Into<Hsla>) -> impl IntoElement {
    let color: Hsla = color.into();
    canvas(
        |_, _, _| {},
        move |bounds: Bounds<Pixels>, _, window: &mut Window, _: &mut App| {
            let unit = f32::from(bounds.size.width);
            let bars = [(0.2031, 0.2625, 0.563), (0.4297, 0.2185, 0.3755), (0.6563, 0.1745, 0.563)];
            let skew = (11.0_f32).to_radians().tan();
            for (top, left, width) in bars {
                let height = 0.1406 * unit;
                let shift = skew * height;
                let x = f32::from(bounds.origin.x) + left * unit;
                let y = f32::from(bounds.origin.y) + top * unit;
                let w = width * unit;
                let mut path = gpui::PathBuilder::fill();
                path.move_to(point(px(x + shift), px(y)));
                path.line_to(point(px(x + w + shift), px(y)));
                path.line_to(point(px(x + w), px(y + height)));
                path.line_to(point(px(x), px(y + height)));
                path.close();
                if let Ok(path) = path.build() {
                    window.paint_path(path, color);
                }
            }
        },
    )
    .size(px(size_px))
    .flex_none()
    .into_any_element()
}
