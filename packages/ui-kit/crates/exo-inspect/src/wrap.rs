//! The contract components call: `.inspect(Inspect::button("play", "Play"))`.
//!
//! `Inspected<E>` wraps any styled element. It forwards `Styled`, `ParentElement` and `InteractiveElement`, so it can sit
//! anywhere in a builder chain. It always exists (a screen reader may ask in a release build), but it records nothing
//! until something reads the tree: the test server or a UI Automation client.
use crate::spec::Inspect;
use gpui::{AnyElement, InteractiveElement, Interactivity, IntoElement, ParentElement, StatefulInteractiveElement, StyleRefinement, Styled};

/// What the styles set on the element so far say about its words and its clipping, read when the element is built.
#[derive(Clone, Default)]
pub struct StyleInfo {
    pub text: gpui::TextStyleRefinement,
    pub overflow_x: Option<gpui::Overflow>,
    pub overflow_y: Option<gpui::Overflow>,
    pub hidden: bool,
}

fn style_info<E: Styled>(e: &mut E) -> StyleInfo {
    let s = e.style();
    StyleInfo {
        text: s.text.clone().unwrap_or_default(),
        overflow_x: s.overflow.x,
        overflow_y: s.overflow.y,
        hidden: matches!(s.visibility, Some(gpui::Visibility::Hidden)),
    }
}

pub struct Inspected<E> {
    inner: E,
    spec: Inspect,
    style_of: fn(&mut E) -> StyleInfo,
}

/// `.inspect(spec)` on any styled element.
pub trait InspectExt: IntoElement + Styled + Sized + 'static {
    fn inspect(self, spec: Inspect) -> Inspected<Self> {
        Inspected { inner: self, spec, style_of: style_info::<Self> }
    }
}

impl<E: IntoElement + Styled + 'static> InspectExt for E {}

impl<E: Styled> Styled for Inspected<E> {
    fn style(&mut self) -> &mut StyleRefinement {
        self.inner.style()
    }
}

impl<E: ParentElement> ParentElement for Inspected<E> {
    fn extend(&mut self, elements: impl IntoIterator<Item = AnyElement>) {
        self.inner.extend(elements)
    }
}

impl<E: InteractiveElement> InteractiveElement for Inspected<E> {
    fn interactivity(&mut self) -> &mut Interactivity {
        self.inner.interactivity()
    }
}

impl<E: StatefulInteractiveElement> StatefulInteractiveElement for Inspected<E> {}

impl<E: IntoElement + 'static> IntoElement for Inspected<E> {
    type Element = crate::element::InspectedElement<E::Element>;
    fn into_element(mut self) -> Self::Element {
        let style = if crate::recording() { (self.style_of)(&mut self.inner) } else { StyleInfo::default() };
        crate::element::InspectedElement::new(self.inner.into_element(), self.spec, style)
    }
}
