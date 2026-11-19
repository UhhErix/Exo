//! The element that records what it wraps. It adds no layout of its own: every phase goes to the inner element, and
//! on the way, while something is reading (`crate::recording()`), it writes one [`Entry`] into the window's registry.
use crate::registry::{self, Entry, FocusInfo, Rect, ScrollInfo, TextInfo};
use crate::spec::{Inspect, Role};
use crate::wrap::StyleInfo;
use gpui::{App, Bounds, Element, ElementId, GlobalElementId, InspectorElementId, IntoElement, LayoutId, Overflow, Pixels, Refineable, WhiteSpace, Window};

pub struct InspectedElement<E: Element> {
    inner: E,
    spec: Inspect,
    style: StyleInfo,
}

impl<E: Element> InspectedElement<E> {
    pub fn new(inner: E, spec: Inspect, style: StyleInfo) -> Self {
        InspectedElement { inner, spec, style }
    }

    fn is_root(&self) -> bool {
        self.spec.role == Role::Window
    }

    fn text_info(&self, window: &mut Window, bounds: Bounds<Pixels>) -> Option<TextInfo> {
        // Shaping the words again is the test server's business; a screen reader needs only the name.
        if !cfg!(feature = "testkit") || !self.spec.role.is_text() {
            return None;
        }
        let content = self.spec.name.clone().filter(|s| !s.is_empty())?;
        let mut ts = window.text_style();
        ts.refine(&self.style.text);
        let rem = window.rem_size();
        let size = ts.font_size.to_pixels(rem);
        let line_h = ts.line_height_in_pixels(rem);
        let wraps = !matches!(ts.white_space, WhiteSpace::Nowrap);
        let runs = [ts.to_run(content.len())];
        let wrap_width = if wraps { Some(bounds.size.width) } else { None };
        let lines = window.text_system().shape_text(content.clone().into(), size, &runs, wrap_width, ts.line_clamp).ok()?;
        let natural_w = lines.iter().map(|l| f32::from(l.width())).fold(0.0, f32::max);
        let natural_h: f32 = lines.iter().map(|l| f32::from(l.size(line_h).height)).sum();
        let n = lines.iter().map(|l| l.wrap_boundaries().len() + 1).sum();
        Some(TextInfo {
            content,
            font_size: (f32::from(size) * 100.0).round() / 100.0,
            weight: ts.font_weight.0,
            family: ts.font_family.to_string(),
            line_height: f32::from(line_h),
            natural_w,
            natural_h,
            lines: n,
            wraps,
            ellipsis: self.spec.truncates || ts.text_overflow.is_some(),
            color: {
                let c = ts.color.to_rgb();
                [(c.r * 255.0).round() as u8, (c.g * 255.0).round() as u8, (c.b * 255.0).round() as u8, (c.a * 255.0).round() as u8]
            },
        })
    }
}

impl<E: Element> IntoElement for InspectedElement<E> {
    type Element = Self;
    fn into_element(self) -> Self {
        self
    }
}

impl<E: Element> Element for InspectedElement<E> {
    type RequestLayoutState = E::RequestLayoutState;
    type PrepaintState = (Option<usize>, E::PrepaintState);

    fn id(&self) -> Option<ElementId> {
        self.inner.id()
    }

    fn source_location(&self) -> Option<&'static std::panic::Location<'static>> {
        self.inner.source_location()
    }

    fn request_layout(&mut self, id: Option<&GlobalElementId>, inspector_id: Option<&InspectorElementId>, window: &mut Window, cx: &mut App) -> (LayoutId, Self::RequestLayoutState) {
        if self.is_root() && crate::recording() {
            registry::begin_frame(window);
        }
        self.inner.request_layout(id, inspector_id, window, cx)
    }

    fn prepaint(&mut self, id: Option<&GlobalElementId>, inspector_id: Option<&InspectorElementId>, bounds: Bounds<Pixels>, state: &mut Self::RequestLayoutState, window: &mut Window, cx: &mut App) -> Self::PrepaintState {
        if !crate::recording() {
            return (None, self.inner.prepaint(id, inspector_id, bounds, state, window, cx));
        }
        let key = registry::window_key(window);
        let text = self.text_info(window, bounds);
        let clips = matches!(self.style.overflow_x, Some(Overflow::Hidden | Overflow::Scroll | Overflow::Clip))
            || matches!(self.style.overflow_y, Some(Overflow::Hidden | Overflow::Scroll | Overflow::Clip));
        let scrolls = self.spec.scroll.is_some() || matches!(self.style.overflow_x, Some(Overflow::Scroll)) || matches!(self.style.overflow_y, Some(Overflow::Scroll));
        let idx = registry::with(|r| {
            let f = r.windows.get_mut(&key)?;
            let parent = f.stack.last().copied();
            let (layer, scroll_parent) = match parent.map(|p| &f.entries[p]) {
                Some(p) => (self.spec.layer.clone().unwrap_or_else(|| p.layer.clone()), if p.is_scroller { parent } else { p.scroll_parent }),
                None => (self.spec.layer.clone().unwrap_or_else(|| "page".into()), None),
            };
            f.entries.push(Entry {
                id: self.spec.id.clone(),
                role: self.spec.role,
                name: self.spec.name.clone(),
                enabled: self.spec.enabled,
                state: self.spec.tree_state(),
                layer,
                parent,
                scroll_parent,
                is_scroller: scrolls,
                bounds: Rect::from_bounds(bounds),
                clip: Rect::from_bounds(bounds),
                painted: false,
                order: 0,
                hidden: self.style.hidden,
                clips,
                text,
                focus: None,
                scroll: None,
                truncates: self.spec.truncates,
                decorative: self.spec.decorative,
                placeholder: self.spec.placeholder,
                password: self.spec.password,
                overlays_parent: self.spec.overlays_parent,
                src: format!("{}:{}", self.spec.src.file().replace('\\', "/"), self.spec.src.line()),
            });
            let i = f.entries.len() - 1;
            f.stack.push(i);
            Some(i)
        });
        let inner = self.inner.prepaint(id, inspector_id, bounds, state, window, cx);
        if idx.is_some() {
            registry::with(|r| r.windows.get_mut(&key).map(|f| f.stack.pop()));
        }
        (idx, inner)
    }

    fn paint(&mut self, id: Option<&GlobalElementId>, inspector_id: Option<&InspectorElementId>, bounds: Bounds<Pixels>, state: &mut Self::RequestLayoutState, prepaint: &mut Self::PrepaintState, window: &mut Window, cx: &mut App) {
        let key = registry::window_key(window);
        let mask = Rect::from_bounds(window.content_mask().bounds);
        let focus = self.spec.focus.as_ref().map(|h| FocusInfo { focused: h.is_focused(window), within: h.contains_focused(window, cx), tab_stop: h.tab_stop, tab_index: h.tab_index });
        let scroll = self.spec.scroll.as_ref().map(|s| {
            let off = s.0.offset();
            let max = s.0.max_offset();
            ScrollInfo { x: -f32::from(off.x), y: -f32::from(off.y), max_x: f32::from(max.width), max_y: f32::from(max.height) }
        });
        let idx = prepaint.0;
        if let Some(i) = idx {
            registry::with(|r| {
                if let Some(f) = r.windows.get_mut(&key) {
                    f.painted += 1;
                    let order = f.painted;
                    if let Some(e) = f.entries.get_mut(i) {
                        e.painted = true;
                        e.order = order;
                        e.clip = mask;
                        e.focus = focus;
                        e.scroll = scroll;
                    }
                    f.stack.push(i);
                }
            });
        }
        self.inner.paint(id, inspector_id, bounds, state, &mut prepaint.1, window, cx);
        if idx.is_some() {
            registry::with(|r| r.windows.get_mut(&key).map(|f| f.stack.pop()));
        }
        if self.is_root() && idx.is_some() {
            registry::end_frame(window);
            crate::uia::frame_done(window);
        }
    }
}
