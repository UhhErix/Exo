//! Hello, Exo: one window with a glass panel, a button and a text field. It uses exo-design and nothing else of the kit.

use exo_design::controls::{self, ButtonKind, label};
use exo_design::{TextField, glass, t};
use gpui::{
    Application, Bounds, Context, Entity, FontWeight, Render, TitlebarOptions, Window, WindowBounds, WindowOptions, div,
    linear_color_stop, linear_gradient, prelude::*, px, rgb, size,
};

struct Hello {
    field: Entity<TextField>,
    greeted: u32,
}

impl Render for Hello {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let name = self.field.read(cx).text().to_string();
        let greeting = match (self.greeted, name.trim()) {
            (0, _) => "Hello, Exo".to_string(),
            (_, "") => "Hello, stranger".to_string(),
            (_, who) => format!("Hello, {who}"),
        };
        // A loud backdrop under the panel, so the glass has something to blur.
        let backdrop = linear_gradient(115.0, linear_color_stop(rgb(0xff3b6b), 0.0), linear_color_stop(rgb(0x1a5cff), 1.0));

        div()
            .size_full()
            .relative()
            .bg(t::VOID)
            .font_family(exo_design::FONT)
            .text_color(t::FG)
            .flex()
            .items_center()
            .justify_center()
            .child(div().absolute().top_0().left_0().w(px(520.0)).h_full().bg(backdrop))
            .child(
                glass(t::PANE_GLASS, t::PANEL_RADIUS)
                    .flex()
                    .flex_col()
                    .gap(px(t::GAP))
                    .p(px(t::GAP * 2.0))
                    .w(px(340.0))
                    .child(label(greeting, t::TEXT_TITLE, FontWeight::SEMIBOLD, t::FG))
                    .child(self.field.clone())
                    .child(
                        controls::button("say-hello", "Say hello", ButtonKind::Primary).on_click(cx.listener(|this, _, _, cx| {
                            this.greeted += 1;
                            cx.notify();
                        })),
                    ),
            )
    }
}

fn main() {
    Application::new().with_assets(exo_design::Assets).run(|cx| {
        exo_design::init(cx);
        let options = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(Bounds::centered(None, size(px(520.0), px(360.0)), cx))),
            titlebar: Some(TitlebarOptions { title: Some("hello-exo".into()), appears_transparent: false, ..Default::default() }),
            ..Default::default()
        };
        cx.open_window(options, |_, cx| {
            cx.new(|cx| Hello { field: cx.new(|cx| TextField::new("Your name", cx)), greeted: 0 })
        })
        .expect("a window");
        cx.on_window_closed(|cx| cx.quit()).detach();
        cx.activate(true);
    });
}
