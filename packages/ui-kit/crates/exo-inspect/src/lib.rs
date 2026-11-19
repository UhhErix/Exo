//! What Exo's GPUI elements are, said by the elements themselves: GPUI has no DOM and no accessibility tree, so a
//! component states its role, name and state with one call, `.inspect(Inspect::button("play", "Play"))`. Each painted
//! frame then yields a semantic tree (bounds, clip, layer, focus, scroll, paint order) for two readers:
//!
//! - the **test server** (`testkit` feature, `server::attach`): a named pipe that answers `tree`, `wait_for`, and drives
//!   the window with input posted to its own message queue, so suites find elements by what they are, not by coordinates;
//! - a **screen reader**, through UI Automation (`uia`).
//!
//! Nothing is recorded until one of them reads ([`recording`]): an idle window, or one nobody inspects, pays one wrapper
//! element per annotated element and a branch.
mod element;
mod registry;
mod spec;
mod wrap;

#[cfg(feature = "testkit")]
pub mod server;
pub mod uia;

pub use registry::{Entry, Rect};
pub use spec::{Inspect, Role};
pub use wrap::{InspectExt, Inspected};

use std::sync::atomic::{AtomicU8, Ordering};

/// Who is reading the tree: bit 0 the test server, bit 1 a UI Automation client.
static READERS: AtomicU8 = AtomicU8::new(0);
#[cfg_attr(not(feature = "testkit"), allow(dead_code))]
pub(crate) const TEST_SERVER: u8 = 1;
pub(crate) const UIA: u8 = 2;

/// Whether frames are being recorded.
pub fn recording() -> bool {
    READERS.load(Ordering::Relaxed) != 0
}

pub(crate) fn start_reading(who: u8) {
    READERS.fetch_or(who, Ordering::Relaxed);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builders_say_what_they_are() {
        let s = Inspect::button("play", "Play").disabled().state("pressed", true).layer("sheet");
        assert_eq!((s.id.as_str(), s.role, s.enabled), ("play", Role::Button, false));
        assert_eq!(s.name.as_deref(), Some("Play"));
        assert_eq!(s.state["pressed"], serde_json::json!(true));
        assert_eq!(s.layer.as_deref(), Some("sheet"));
        assert!(Role::Button.is_control() && !Role::Text.is_control() && Role::Heading.is_text());
        assert_eq!(Inspect::dialog("sheet", "A sheet").layer.as_deref(), Some("sheet"));
    }

    #[test]
    fn nothing_records_until_a_reader_asks() {
        assert!(!recording());
        start_reading(TEST_SERVER);
        assert!(recording());
    }
}
