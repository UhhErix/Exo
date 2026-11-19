//! The semantic tree as a screen reader sees it: AccessKit's UI Automation provider on the window.
//!
//! gpui answers no `WM_GETOBJECT`, so Narrator would find an empty window. AccessKit's `SubclassingAdapter` subclasses the
//! window and answers for it; no gpui patch. The tree is the frame's [`Entry`] list, the same one the test server reads:
//! one `.inspect(..)` per element serves both.
//!
//! - Nothing is recorded until a UI Automation client first asks (`request_initial_tree`); from then on each drawn frame
//!   is turned into a tree and sent only when it changed. An idle window draws no frames, so it sends nothing.
//! - A screen reader's Invoke on a button, tab or row is a click at the element's middle, posted to the window's own
//!   queue: the element's own handler runs, exactly as for a mouse. The cursor does not move.
use crate::registry::{self, Entry};
use crate::spec::Role;
use accesskit as ak;
use accesskit_windows::SubclassingAdapter;
use futures::StreamExt;
use futures::channel::mpsc::{UnboundedReceiver, UnboundedSender, unbounded};
use gpui::{App, Window};
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use std::cell::RefCell;
use std::hash::{Hash, Hasher};
use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{PostMessageW, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MOUSEMOVE};

const ROOT: ak::NodeId = ak::NodeId(1);

enum Ask {
    /// A client connected: draw a frame so the tree exists.
    Frame,
    Action(ak::ActionRequest),
}

struct Installed {
    window: u64,
    hwnd: HWND,
    adapter: SubclassingAdapter,
    last: u64,
    /// The last tree's nodes by AccessKit id, for the actions that arrive between frames.
    targets: Vec<(ak::NodeId, f32, f32)>,
}

struct Pending {
    hwnd: HWND,
    adapter: SubclassingAdapter,
    asks: UnboundedReceiver<Ask>,
}

thread_local! {
    static BRIDGES: RefCell<Vec<Installed>> = const { RefCell::new(Vec::new()) };
    /// Adapters made as their window was created, waiting for `install` to tie them to the gpui window.
    static PENDING: RefCell<Vec<Pending>> = const { RefCell::new(Vec::new()) };
}

static TITLE: std::sync::OnceLock<&'static str> = std::sync::OnceLock::new();

struct Activation {
    title: String,
    asks: UnboundedSender<Ask>,
}

impl ak::ActivationHandler for Activation {
    fn request_initial_tree(&mut self) -> Option<ak::TreeUpdate> {
        crate::start_reading(crate::UIA);
        let _ = self.asks.unbounded_send(Ask::Frame);
        let mut root = ak::Node::new(ak::Role::Window);
        root.set_label(self.title.clone());
        let mut tree = ak::TreeInfo::new(ROOT);
        tree.toolkit_name = Some("exo-inspect (GPUI)".into());
        Some(ak::TreeUpdate { nodes: vec![(ROOT, root)], tree: Some(tree), tree_id: ak::TreeId::ROOT, focus: ROOT })
    }
}

struct Actions(UnboundedSender<Ask>);

impl ak::ActionHandler for Actions {
    fn do_action(&mut self, request: ak::ActionRequest) {
        let _ = self.0.unbounded_send(Ask::Action(request));
    }
}

fn hwnd_of(window: &Window) -> Option<HWND> {
    match HasWindowHandle::window_handle(window).ok()?.as_raw() {
        RawWindowHandle::Win32(h) => Some(HWND(h.hwnd.get() as *mut _)),
        _ => None,
    }
}

/// Every window opened from now on gets a UI Automation provider, named `title`. Call before the first window opens:
/// AccessKit must hook a window before it is first shown, so this runs inside gpui's window creation (the vendored
/// gpui's `on_window_created`), and [`install`] then ties it to the gpui window.
pub fn enable(title: &'static str) {
    let _ = TITLE.set(title);
    gpui::on_window_created(created);
}

fn created(raw: isize) {
    let hwnd = HWND(raw as *mut _);
    let (tx, asks) = unbounded::<Ask>();
    let title = TITLE.get().copied().unwrap_or_default().to_string();
    let adapter = SubclassingAdapter::new(hwnd, Activation { title, asks: tx.clone() }, Actions(tx));
    PENDING.with(|p| p.borrow_mut().push(Pending { hwnd, adapter, asks }));
}

/// Ties the provider made at the window's creation to the gpui window: its frames and its actions. Call once per window,
/// from `open_window`'s closure.
pub fn install(window: &mut Window, cx: &mut App) {
    let Some(hwnd) = hwnd_of(window) else { return };
    let Some(Pending { adapter, asks: mut rx, .. }) = PENDING.with(|p| {
        let mut p = p.borrow_mut();
        let i = p.iter().position(|x| x.hwnd == hwnd)?;
        Some(p.swap_remove(i))
    }) else {
        return;
    };
    let key = registry::window_key(window);
    BRIDGES.with(|b| b.borrow_mut().push(Installed { window: key, hwnd, adapter, last: 0, targets: Vec::new() }));
    window
        .spawn(cx, async move |cx| {
            while let Some(ask) = rx.next().await {
                let _ = cx.update(|window, _| match ask {
                    Ask::Frame => window.refresh(),
                    Ask::Action(req) => act(window, req),
                });
            }
        })
        .detach();
}

fn role(e: &Entry) -> ak::Role {
    role_of(e.role, e.password)
}

/// The UI Automation control type of an element. A password is an Edit that UI Automation marks `IsPassword`: AccessKit's
/// `PasswordInput`, which also gets no Value pattern unless a value is set, and none is.
fn role_of(role: Role, password: bool) -> ak::Role {
    match role {
        Role::TextInput if password => ak::Role::PasswordInput,
        Role::Window => ak::Role::Window,
        Role::Group => ak::Role::Group,
        Role::Text => ak::Role::Label,
        Role::Heading => ak::Role::Heading,
        Role::Image => ak::Role::Image,
        Role::Icon => ak::Role::Image,
        Role::Button => ak::Role::Button,
        Role::Tab => ak::Role::Tab,
        Role::Switch => ak::Role::Switch,
        Role::Checkbox => ak::Role::CheckBox,
        Role::Slider => ak::Role::Slider,
        Role::TextInput => ak::Role::TextInput,
        Role::List => ak::Role::List,
        Role::ListItem => ak::Role::ListItem,
        Role::Scroll => ak::Role::ScrollView,
        Role::Menu => ak::Role::Menu,
        Role::MenuItem => ak::Role::MenuItem,
        Role::Dialog => ak::Role::Dialog,
        Role::Toast => ak::Role::Alert,
        Role::Separator => ak::Role::Splitter,
    }
}

/// A node id that stays the same from frame to frame for the same element: its id, and its index only when the id repeats.
fn node_id(e: &Entry, i: usize, seen: &mut std::collections::HashSet<u64>) -> ak::NodeId {
    if e.role == Role::Window {
        return ROOT;
    }
    let mut h = std::collections::hash_map::DefaultHasher::new();
    e.id.hash(&mut h);
    let mut id = h.finish() | 2;
    if !seen.insert(id) {
        i.hash(&mut h);
        id = h.finish() | 2;
        seen.insert(id);
    }
    ak::NodeId(id)
}

/// The frame just painted becomes the screen reader's tree, if a client is listening and it changed.
pub(crate) fn frame_done(window: &Window) {
    let key = registry::window_key(window);
    if !BRIDGES.with(|b| b.borrow().iter().any(|i| i.window == key)) {
        return;
    }
    let scale = window.scale_factor();
    let Some((nodes, targets, fingerprint, focus)) = registry::with(|r| r.windows.get(&key).map(|f| build(&f.entries, scale))) else { return };
    let update = BRIDGES.with(|b| {
        let mut b = b.borrow_mut();
        let i = b.iter_mut().find(|i| i.window == key)?;
        i.targets = targets;
        if i.last == fingerprint {
            return None;
        }
        // Remembered only once a client has the tree: before activation AccessKit drops updates.
        let mut sent = false;
        let events = i.adapter.update_if_active(|| {
            sent = true;
            ak::TreeUpdate { nodes, tree: Some(ak::TreeInfo::new(ROOT)), tree_id: ak::TreeId::ROOT, focus }
        });
        if sent {
            i.last = fingerprint;
        }
        events
    });
    // Raised outside the borrow: a client may call back into the window while it does.
    if let Some(events) = update {
        events.raise();
    }
}

type Built = (Vec<(ak::NodeId, ak::Node)>, Vec<(ak::NodeId, f32, f32)>, u64, ak::NodeId);

fn build(entries: &[Entry], scale: f32) -> Built {
    let mut seen = std::collections::HashSet::new();
    let ids: Vec<ak::NodeId> = entries.iter().enumerate().map(|(i, e)| node_id(e, i, &mut seen)).collect();
    let shown = |e: &Entry| e.painted && !e.hidden && !e.decorative && e.bounds.intersect(&e.clip).area() > 0.0;
    // Each shown node's nearest shown ancestor; what is hidden or decorative passes its children up.
    let parent_of = |mut p: Option<usize>| {
        while let Some(i) = p {
            if shown(&entries[i]) || entries[i].role == Role::Window {
                return Some(i);
            }
            p = entries[i].parent;
        }
        None
    };
    let mut children: Vec<Vec<ak::NodeId>> = vec![Vec::new(); entries.len()];
    let mut hash = std::collections::hash_map::DefaultHasher::new();
    let mut targets = Vec::new();
    // Keyboard focus: the shown element whose focus handle has it (`Inspect::focus`), else the window.
    let focus = entries
        .iter()
        .enumerate()
        .rev()
        .find(|(_, e)| e.role != Role::Window && shown(e) && e.focus.as_ref().is_some_and(|f| f.focused))
        .map_or(ROOT, |(i, _)| ids[i]);
    focus.0.hash(&mut hash);
    for (i, e) in entries.iter().enumerate() {
        if e.role == Role::Window || !shown(e) {
            continue;
        }
        if let Some(p) = parent_of(e.parent) {
            children[p].push(ids[i]);
        }
    }
    let mut nodes = Vec::new();
    for (i, e) in entries.iter().enumerate() {
        if e.role != Role::Window && !shown(e) {
            continue;
        }
        let mut n = ak::Node::new(role(e));
        if let Some(name) = e.name.as_deref().filter(|n| !n.is_empty()) {
            n.set_label(name.to_string());
        }
        let v = e.bounds.intersect(&e.clip);
        let b = ak::Rect { x0: (v.x * scale) as f64, y0: (v.y * scale) as f64, x1: ((v.x + v.w) * scale) as f64, y1: ((v.y + v.h) * scale) as f64 };
        n.set_bounds(b);
        if let Some(sel) = e.state.get("selected").and_then(|v| v.as_bool()) {
            n.set_selected(sel);
        }
        if let Some(on) = e.state.get("checked").and_then(|v| v.as_bool()) {
            n.set_toggled(if on { ak::Toggled::True } else { ak::Toggled::False });
        }
        if !e.enabled {
            n.set_disabled();
        }
        if e.focus.is_some() {
            n.add_action(ak::Action::Focus);
        }
        // A notice speaks for itself: a polite live region, an assertive one for a failure.
        if e.role == Role::Toast {
            let urgent = e.state.get("tone").and_then(|v| v.as_str()) == Some("bad");
            n.set_live(if urgent { ak::Live::Assertive } else { ak::Live::Polite });
        }
        if e.role.is_control() || e.role == Role::ListItem {
            n.add_action(ak::Action::Click);
            targets.push((ids[i], v.x + v.w / 2.0, v.y + v.h / 2.0));
        }
        if !children[i].is_empty() {
            n.set_children(children[i].clone());
        }
        (ids[i].0, e.role.as_str(), e.password, &e.name, e.state.get("selected").map(|v| v.to_string()), (b.x0 as i32, b.y0 as i32, b.x1 as i32, b.y1 as i32), &children[i])
            .hash(&mut hash);
        nodes.push((ids[i], n));
    }
    (nodes, targets, hash.finish(), focus)
}

fn act(window: &mut Window, req: ak::ActionRequest) {
    if req.action != ak::Action::Click {
        return;
    }
    let key = registry::window_key(window);
    let scale = window.scale_factor();
    let found = BRIDGES.with(|b| {
        let b = b.borrow();
        let i = b.iter().find(|i| i.window == key)?;
        let (_, x, y) = i.targets.iter().find(|(id, ..)| *id == req.target_node)?;
        Some((i.hwnd, *x, *y))
    });
    let Some((hwnd, x, y)) = found else { return };
    let (px, py) = ((x * scale).round() as i32, (y * scale).round() as i32);
    let at = LPARAM(((py as u16 as u32) << 16 | (px as u16 as u32)) as isize);
    unsafe {
        let _ = PostMessageW(Some(hwnd), WM_MOUSEMOVE, WPARAM(0), at);
        let _ = PostMessageW(Some(hwnd), WM_LBUTTONDOWN, WPARAM(1), at);
        let _ = PostMessageW(Some(hwnd), WM_LBUTTONUP, WPARAM(0), at);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_password_is_an_edit_that_says_password_and_gives_no_value() {
        let node = ak::Node::new(role_of(Role::TextInput, true));
        assert_eq!(node.role(), ak::Role::PasswordInput);
        // AccessKit's Windows adapter answers IsPassword for a PasswordInput, and its Value pattern only when a value is
        // set: this node has none.
        assert_eq!(node.value(), None);
    }

    #[test]
    fn a_plain_text_input_is_not_a_password() {
        assert_eq!(role_of(Role::TextInput, false), ak::Role::TextInput);
        assert_ne!(ak::Node::new(role_of(Role::TextInput, false)).role(), ak::Role::PasswordInput);
    }
}
