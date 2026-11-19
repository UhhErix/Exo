//! Every piece of exo-design on one page, over a loud backdrop so the glass shows. `cargo run --release -p exo-design --example gallery`.

use exo_design::controls::{self, ButtonKind, capsule, divider, exo_mark, icon, icon_button, label, menu, menu_heading, menu_row, slider, switch, tab};
use exo_design::{TextField, glass, icon as glyph, t};
use gpui::{
    Application, Bounds, Context, Entity, FontWeight, Render, TitlebarOptions, Window, WindowBounds, WindowOptions, div, linear_color_stop,
    linear_gradient, prelude::*, px, rgb, size,
};

struct Gallery {
    on: bool,
    volume: f32,
    field: Entity<TextField>,
    sheet: bool,
}

impl Render for Gallery {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let entity = cx.entity();
        let backdrop = linear_gradient(
            115.0,
            linear_color_stop(rgb(0xff3b6b), 0.0),
            linear_color_stop(rgb(0x1a5cff), 1.0),
        );
        div()
            .size_full()
            .relative()
            .bg(t::VOID)
            .font_family(exo_design::FONT)
            .text_color(t::FG)
            .flex()
            .flex_col()
            .gap(px(18.0))
            .p(px(t::GAP))
            .child(div().absolute().top_0().left_0().w(px(620.0)).h_full().bg(backdrop))
            .child(
                div()
                    .flex()
                    .gap(px(t::GAP))
                    .child(capsule().px(px(10.0)).gap(px(10.0)).child(exo_mark(18.0, t::FG)).child(label("Search", t::TEXT_BODY, FontWeight::MEDIUM, t::FG)))
                    .child(capsule().px(px(2.0)).gap(px(2.0)).child(tab("a", "Library", glyph::LIBRARY, true)).child(tab("b", "Music", glyph::MUSIC, false)))
                    .child(capsule().px(px(2.0)).gap(px(2.0)).child(icon_button("c", glyph::SETTINGS, false)).child(divider()).child(icon_button("d", glyph::CLOSE, false))),
            )
            .child(label("Section name", t::TEXT_TITLE, FontWeight::SEMIBOLD, t::FG))
            .child(
                div()
                    .flex()
                    .gap(px(8.0))
                    .child(controls::button("primary", "Primary", ButtonKind::Primary))
                    .child(controls::button("raised", "Raised", ButtonKind::Raised))
                    .child(controls::button("quiet", "Quiet", ButtonKind::Quiet))
                    .child(controls::button("danger", "Danger", ButtonKind::Danger))
                    .child(
                        controls::button("open-sheet", "Open a sheet", ButtonKind::Raised)
                            .on_click(cx.listener(|this, _, _, cx| {
                                this.sheet = true;
                                cx.notify();
                            })),
                    ),
            )
            .child(div().w(px(300.0)).child(self.field.clone()))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap(px(12.0))
                    .child(switch("switch", self.on, {
                        let entity = entity.clone();
                        move |on, _, cx| {
                            entity.update(cx, |this, cx| {
                                this.on = on;
                                cx.notify();
                            })
                        }
                    }))
                    .child(div().w(px(240.0)).child(slider("slider", self.volume, {
                        let entity = entity.clone();
                        move |value, _, cx| {
                            entity.update(cx, |this, cx| {
                                this.volume = value;
                                cx.notify();
                            })
                        }
                    })))
                    .child(label(format!("{:.0}%", self.volume * 100.0), t::TEXT_SMALL, FontWeight::MEDIUM, t::FG)),
            )
            .child(
                div()
                    .flex()
                    .gap(px(t::GAP))
                    .child(
                        menu()
                            .w(px(220.0))
                            .child(menu_heading("Sort", true))
                            .child(menu_row("m1", None, "Name", true))
                            .child(menu_row("m2", None, "Recent", false))
                            .child(menu_row("m3", None, "Size", false)),
                    )
                    .child(
                        glass(t::PANE_GLASS, t::PANEL_RADIUS)
                            .w(px(240.0))
                            .h(px(150.0))
                            .p(px(16.0))
                            .flex()
                            .flex_col()
                            .gap(px(8.0))
                            .child(label("A pane", t::TEXT_BODY, FontWeight::SEMIBOLD, t::FG))
                            .child(div().flex().gap(px(6.0)).child(icon(glyph::CHECK, 16.0, t::GOOD)).child(label("Good", t::TEXT_SMALL, FontWeight::MEDIUM, t::GOOD))),
                    ),
            )
            .when(self.sheet, |page| {
                page.child(controls::sheet(
                    "sheet",
                    420.0,
                    label("A sheet of large glass", t::TEXT_TITLE, FontWeight::SEMIBOLD, t::FG).into_any_element(),
                    {
                        let entity = entity.clone();
                        move |_, cx| {
                            entity.update(cx, |this, cx| {
                                this.sheet = false;
                                cx.notify();
                            })
                        }
                    },
                ))
            })
    }
}

fn main() {
    Application::new().with_assets(exo_design::Assets).run(|cx| {
        exo_design::init(cx);
        let options = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(Bounds::centered(None, size(px(1000.0), px(640.0)), cx))),
            titlebar: Some(TitlebarOptions { title: Some("exo-design".into()), appears_transparent: false, ..Default::default() }),
            ..Default::default()
        };
        cx.open_window(options, |_, cx| {
            cx.new(|cx| Gallery { on: true, volume: 0.6, field: cx.new(|cx| TextField::new("Search", cx)), sheet: false })
        })
        .expect("a window");
        cx.on_window_closed(|cx| cx.quit()).detach();
        cx.activate(true);
    });
}
