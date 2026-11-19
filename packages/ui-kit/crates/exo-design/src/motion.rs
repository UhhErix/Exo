//! DESIGN.md › Feel, without CSS: gpui has no transitions, so a view keeps its moving values here and reads them as it
//! renders. The idle rule holds: a frame is asked for only while a value is on its way ([`Motion::frame`]), and the last
//! frame lands exactly on the target, so a view at rest draws nothing.
//!
//! ```ignore
//! // render:
//! let s = self.motion.get("tile-3", 1.0);           // 0.97 while pressed
//! self.motion.frame(window);                          // one more frame if anything moves
//! // a press:
//! self.motion.to("tile-3", motion::PRESSED, t::PRESS, Ease::Out);
//! ```

use gpui::{SharedString, Window};
use std::collections::HashMap;
use std::time::{Duration, Instant};

/// Every press gives way a little (DESIGN.md: 0.97).
pub const PRESSED: f32 = 0.97;

/// `tokens.css`' curves.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Ease {
    /// `--ease-out`: cubic-bezier(0.23, 1, 0.32, 1).
    Out,
    /// `--ease-in-out`: cubic-bezier(0.77, 0, 0.175, 1).
    InOut,
    /// `--ease-spring`'s shape: a quick rise, a small overshoot, settled.
    Spring,
    Linear,
}

impl Ease {
    pub fn at(self, x: f32) -> f32 {
        let x = x.clamp(0.0, 1.0);
        match self {
            Ease::Out => bezier(0.23, 1.0, 0.32, 1.0, x),
            Ease::InOut => bezier(0.77, 0.0, 0.175, 1.0, x),
            // A damped spring: ~6% over at 45%, back by the end (close to tokens.css' linear() table).
            Ease::Spring => {
                if x >= 1.0 {
                    1.0
                } else {
                    1.0 - (-6.5 * x).exp() * (1.0 - x) * (std::f32::consts::PI * 1.1 * x).cos()
                }
            }
            Ease::Linear => x,
        }
    }
}

/// CSS's cubic-bezier, solved for x by Newton's method then bisection.
fn bezier(x1: f32, y1: f32, x2: f32, y2: f32, x: f32) -> f32 {
    let curve = |a: f32, b: f32, t: f32| 3.0 * a * t * (1.0 - t).powi(2) + 3.0 * b * t * t * (1.0 - t) + t.powi(3);
    let slope = |a: f32, b: f32, t: f32| 3.0 * a * (1.0 - t).powi(2) + 6.0 * (b - a) * t * (1.0 - t) + 3.0 * (1.0 - b) * t * t;
    let mut t = x;
    for _ in 0..8 {
        let d = slope(x1, x2, t);
        if d.abs() < 1e-6 {
            break;
        }
        t -= (curve(x1, x2, t) - x) / d;
    }
    if !(0.0..=1.0).contains(&t) || (curve(x1, x2, t) - x).abs() > 1e-4 {
        let (mut lo, mut hi) = (0.0, 1.0);
        t = x;
        for _ in 0..30 {
            if curve(x1, x2, t) < x { lo = t } else { hi = t }
            t = (lo + hi) / 2.0;
        }
    }
    curve(y1, y2, t)
}

#[derive(Clone, Copy, Debug)]
struct Tween {
    from: f32,
    to: f32,
    start: Instant,
    duration: Duration,
    ease: Ease,
}

impl Tween {
    fn at(&self, now: Instant) -> f32 {
        // A change that lands at once (Reduce motion) is there at once, not after the next microsecond.
        if self.duration.is_zero() {
            return self.to;
        }
        let done = now.saturating_duration_since(self.start).as_secs_f32() / self.duration.as_secs_f32();
        if done >= 1.0 { self.to } else { self.from + (self.to - self.from) * self.ease.at(done) }
    }

    fn moving(&self, now: Instant) -> bool {
        now.saturating_duration_since(self.start) < self.duration
    }
}

/// A view's moving values, by key.
#[derive(Default)]
pub struct Motion {
    tweens: HashMap<SharedString, Tween>,
    /// Reduce motion (Windows' animation setting, or Exo's): every change lands at once.
    pub reduced: bool,
}

impl Motion {
    /// The value now, or `rest` if it never moved.
    pub fn get(&self, key: impl Into<SharedString>, rest: f32) -> f32 {
        self.tweens.get(&key.into()).map_or(rest, |t| t.at(Instant::now()))
    }

    /// Off from where it is now (or from `from` if it has no value yet) to `to`.
    pub fn to_from(&mut self, key: impl Into<SharedString>, from: f32, to: f32, duration: Duration, ease: Ease) {
        let key = key.into();
        let now = Instant::now();
        let from = self.tweens.get(&key).map_or(from, |t| t.at(now));
        let duration = if self.reduced { Duration::ZERO } else { duration };
        self.tweens.insert(key, Tween { from, to, start: now, duration, ease });
    }

    /// Off to `to` from where it is; a value that never moved starts at `to` already only if `rest` is it.
    pub fn to(&mut self, key: impl Into<SharedString>, to: f32, duration: Duration, ease: Ease) {
        self.to_from(key, 1.0, to, duration, ease);
    }

    /// Forgets a value: it reads as its rest again.
    pub fn clear(&mut self, key: impl Into<SharedString>) {
        self.tweens.remove(&key.into());
    }

    pub fn moving(&self) -> bool {
        let now = Instant::now();
        self.tweens.values().any(|t| t.moving(now))
    }

    /// Call at the end of render: one more frame while anything moves, none after.
    pub fn frame(&self, window: &mut Window) {
        if self.moving() {
            window.request_animation_frame();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curves_start_at_zero_and_land_on_one() {
        for ease in [Ease::Out, Ease::InOut, Ease::Spring, Ease::Linear] {
            assert!(ease.at(0.0).abs() < 1e-3, "{ease:?}");
            assert!((ease.at(1.0) - 1.0).abs() < 1e-6, "{ease:?}");
        }
        // ease-out is mostly done early; the spring overshoots and comes back.
        assert!(Ease::Out.at(0.3) > 0.8);
        assert!((0..=100).map(|i| Ease::Spring.at(i as f32 / 100.0)).fold(0.0, f32::max) > 1.0);
    }

    #[test]
    fn bezier_matches_css() {
        // CSS's `ease` (0.25, 0.1, 0.25, 1) is 0.8024 halfway; ease-in-out is slow at both ends.
        assert!((bezier(0.25, 0.1, 0.25, 1.0, 0.5) - 0.8024).abs() < 2e-3);
        assert!(Ease::InOut.at(0.25) < 0.25 && Ease::InOut.at(0.75) > 0.75);
    }

    #[test]
    fn a_tween_stops_moving_and_holds_its_target() {
        let mut motion = Motion::default();
        motion.to("a", PRESSED, Duration::from_millis(20), Ease::Out);
        assert!(motion.moving());
        std::thread::sleep(Duration::from_millis(30));
        assert!(!motion.moving());
        assert_eq!(motion.get("a", 1.0), PRESSED);
        assert_eq!(motion.get("b", 1.0), 1.0);
    }

    #[test]
    fn reduced_motion_lands_at_once() {
        let mut motion = Motion { reduced: true, ..Default::default() };
        motion.to("a", 0.5, Duration::from_millis(200), Ease::Out);
        assert!(!motion.moving());
        assert_eq!(motion.get("a", 1.0), 0.5);
    }
}
