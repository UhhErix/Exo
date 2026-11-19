//! What the last drawn frame said about itself: one [`Entry`] per inspected element, in paint order, with the nearest
//! inspected ancestor as parent. It lives on the UI thread (GPUI draws there); the server asks for it through the
//! foreground executor.
use crate::spec::Role;
use gpui::{Bounds, Pixels, Window};
use serde::Serialize;
use serde_json::{json, Value};
use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};
use std::time::Instant;

#[derive(Clone, Copy, Debug, Serialize, Default, PartialEq)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

impl Rect {
    pub fn from_bounds(b: Bounds<Pixels>) -> Rect {
        Rect { x: f32::from(b.origin.x), y: f32::from(b.origin.y), w: f32::from(b.size.width), h: f32::from(b.size.height) }
    }
    pub fn right(&self) -> f32 {
        self.x + self.w
    }
    pub fn bottom(&self) -> f32 {
        self.y + self.h
    }
    pub fn intersect(&self, o: &Rect) -> Rect {
        let x = self.x.max(o.x);
        let y = self.y.max(o.y);
        Rect { x, y, w: (self.right().min(o.right()) - x).max(0.0), h: (self.bottom().min(o.bottom()) - y).max(0.0) }
    }
    pub fn area(&self) -> f32 {
        self.w * self.h
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct TextInfo {
    pub content: String,
    pub font_size: f32,
    pub weight: f32,
    pub family: String,
    pub line_height: f32,
    /// The widest line the words need, unconstrained when they do not wrap.
    pub natural_w: f32,
    /// The height the words need at the box's width.
    pub natural_h: f32,
    pub lines: usize,
    pub wraps: bool,
    pub ellipsis: bool,
    /// The words' own color as drawn: r, g, b, a (0..255).
    pub color: [u8; 4],
}

#[derive(Clone, Debug, Serialize)]
pub struct FocusInfo {
    pub focused: bool,
    pub within: bool,
    pub tab_stop: bool,
    pub tab_index: isize,
}

#[derive(Clone, Debug, Serialize)]
pub struct ScrollInfo {
    pub x: f32,
    pub y: f32,
    pub max_x: f32,
    pub max_y: f32,
}

#[derive(Clone, Debug)]
pub struct Entry {
    pub id: String,
    pub role: Role,
    pub name: Option<String>,
    pub enabled: bool,
    pub state: BTreeMap<String, Value>,
    pub layer: String,
    pub parent: Option<usize>,
    pub scroll_parent: Option<usize>,
    pub is_scroller: bool,
    pub bounds: Rect,
    pub clip: Rect,
    pub painted: bool,
    pub order: u32,
    pub hidden: bool,
    pub clips: bool,
    pub text: Option<TextInfo>,
    pub focus: Option<FocusInfo>,
    pub scroll: Option<ScrollInfo>,
    pub truncates: bool,
    pub decorative: bool,
    pub placeholder: bool,
    pub password: bool,
    pub overlays_parent: bool,
    pub src: String,
}

impl Entry {
    #[cfg_attr(not(feature = "testkit"), allow(dead_code))]
    pub(crate) fn to_json(&self, i: usize) -> Value {
        let visible = self.painted && !self.hidden && self.bounds.intersect(&self.clip).area() > 0.0;
        let visible_area = if visible { self.bounds.intersect(&self.clip).area() / self.bounds.area().max(0.0001) } else { 0.0 };
        json!({
            "i": i, "id": self.id, "role": self.role.as_str(), "name": self.name,
            "bounds": self.bounds, "clip": self.clip, "visible": visible, "visible_frac": (visible_area * 1000.0).round() / 1000.0,
            "enabled": self.enabled, "state": self.state, "layer": self.layer,
            "parent": self.parent, "scroll_parent": self.scroll_parent, "order": self.order,
            "clips": self.clips, "text": self.text, "focus": self.focus, "scroll": self.scroll,
            "truncates": self.truncates, "decorative": self.decorative, "placeholder": self.placeholder,
            "overlays_parent": self.overlays_parent, "src": self.src,
        })
    }
}

#[derive(Default)]
pub struct Frame {
    pub entries: Vec<Entry>,
    pub stack: Vec<usize>,
    pub number: u64,
    pub viewport: (f32, f32),
    pub scale: f32,
    pub started: Option<Instant>,
    pub painted: u32,
}

#[derive(Default)]
pub struct Registry {
    pub windows: HashMap<u64, Frame>,
    /// When the last recorded frame finished painting, and how many have, across windows: what "settled" waits on.
    pub last_frame: Option<Instant>,
    pub frames: u64,
}

thread_local! {
    static REGISTRY: RefCell<Registry> = RefCell::new(Registry::default());
}

pub fn with<R>(f: impl FnOnce(&mut Registry) -> R) -> R {
    REGISTRY.with(|r| f(&mut r.borrow_mut()))
}

pub fn window_key(window: &Window) -> u64 {
    window.window_handle().window_id().as_u64()
}

/// The root of a window is about to lay out: a new frame starts, the last one's entries go.
pub fn begin_frame(window: &Window) {
    let key = window_key(window);
    with(|r| {
        let f = r.windows.entry(key).or_default();
        f.entries.clear();
        f.stack.clear();
        f.number += 1;
        let v = window.viewport_size();
        f.viewport = (f32::from(v.width), f32::from(v.height));
        f.scale = window.scale_factor();
        f.started = Some(Instant::now());
        f.painted = 0;
    });
}

/// The root finished painting.
pub fn end_frame(_window: &Window) {
    with(|r| {
        r.last_frame = Some(Instant::now());
        r.frames += 1;
    });
}

/// Milliseconds since the last recorded frame, if there was one.
#[cfg_attr(not(feature = "testkit"), allow(dead_code))]
pub fn idle_ms() -> Option<f64> {
    with(|r| r.last_frame.map(|t| t.elapsed().as_secs_f64() * 1000.0))
}

/// The window's tree as JSON: `{ frame, window: {w, h, scale, ...}, nodes: [...] }`.
#[cfg_attr(not(feature = "testkit"), allow(dead_code))]
pub fn snapshot(key: u64) -> Option<Value> {
    with(|r| {
        let f = r.windows.get(&key)?;
        Some(json!({
            "frame": f.number,
            "window": { "w": f.viewport.0, "h": f.viewport.1, "scale": f.scale },
            "nodes": f.entries.iter().enumerate().map(|(i, e)| e.to_json(i)).collect::<Vec<_>>(),
        }))
    })
}

#[cfg_attr(not(feature = "testkit"), allow(dead_code))]
pub fn frame_number(key: u64) -> u64 {
    with(|r| r.windows.get(&key).map(|f| f.number).unwrap_or(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rectangles_intersect_to_nothing_when_apart() {
        let a = Rect { x: 0.0, y: 0.0, w: 10.0, h: 10.0 };
        assert_eq!(a.intersect(&Rect { x: 5.0, y: 5.0, w: 10.0, h: 10.0 }), Rect { x: 5.0, y: 5.0, w: 5.0, h: 5.0 });
        assert_eq!(a.intersect(&Rect { x: 20.0, y: 0.0, w: 5.0, h: 5.0 }).area(), 0.0);
    }
}
