//! A wheel that glides. gpui moves a scroll view a whole notch at a time; Exo's pages ease to where the wheel asked, asking
//! for frames only while they move, so a page at rest draws nothing.

use gpui::{Pixels, ScrollDelta, ScrollWheelEvent, Window, px};

const LINE: f32 = 100.0 / 3.0;
/// The share of the remaining distance covered per 60 Hz frame.
const EASE: f32 = 0.22;

#[derive(Clone, Copy, Debug, Default)]
pub struct SmoothScroll {
    offset: f32,
    target: f32,
    max: f32,
    last_frame: Option<std::time::Instant>,
}

impl SmoothScroll {
    pub fn offset(&self) -> Pixels {
        px(self.offset)
    }

    pub fn is_moving(&self) -> bool {
        self.offset != self.target
    }

    /// How far the content reaches past the view. Keeps the offset inside it.
    pub fn set_max(&mut self, max: Pixels) {
        self.max = f32::from(max).max(0.0);
        self.target = self.target.clamp(0.0, self.max);
        self.offset = self.offset.clamp(0.0, self.max);
    }

    /// A wheel event. True when there is somewhere to go.
    pub fn wheel(&mut self, event: &ScrollWheelEvent) -> bool {
        let delta = match event.delta {
            ScrollDelta::Pixels(delta) => f32::from(delta.y),
            ScrollDelta::Lines(delta) => delta.y * LINE,
        };
        let next = (self.target - delta).clamp(0.0, self.max);
        let moved = next != self.target;
        self.target = next;
        moved
    }

    pub fn scroll_by(&mut self, delta: f32) -> bool {
        let next = (self.target + delta).clamp(0.0, self.max);
        let moved = next != self.target;
        self.target = next;
        moved
    }

    /// One animation frame. True when another is needed.
    pub fn step(&mut self) -> bool {
        let now = std::time::Instant::now();
        let frames = self
            .last_frame
            .map(|then| (now - then).as_secs_f32() * 60.0)
            .unwrap_or(1.0)
            .clamp(0.1, 4.0);
        let remaining = self.target - self.offset;
        let next = self.offset + remaining * (1.0 - (1.0 - EASE).powf(frames));
        // Under half a physical pixel away is there.
        if (self.target - next).abs() < 0.4 {
            self.offset = self.target;
            self.last_frame = None;
            return false;
        }
        self.offset = next;
        self.last_frame = Some(now);
        true
    }

    /// Asks for a frame if the scroll is moving. Call from the view's render.
    pub fn keep_going(&self, window: &mut Window) {
        if self.is_moving() {
            window.request_animation_frame();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_settles_exactly_on_its_target_and_stops_asking() {
        let mut scroll = SmoothScroll::default();
        scroll.set_max(px(1000.0));
        assert!(scroll.scroll_by(300.0));
        let mut frames = 0;
        while scroll.step() {
            frames += 1;
            assert!(frames < 2000);
        }
        assert_eq!(scroll.offset(), px(300.0));
        assert!(!scroll.is_moving());
    }

    #[test]
    fn it_stays_inside_the_content() {
        let mut scroll = SmoothScroll::default();
        scroll.set_max(px(100.0));
        scroll.scroll_by(500.0);
        while scroll.step() {}
        assert_eq!(scroll.offset(), px(100.0));
        assert!(!scroll.scroll_by(50.0));
        scroll.set_max(px(40.0));
        assert_eq!(scroll.offset(), px(40.0));
    }
}
