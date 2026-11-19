//! What an element says about itself so a test can find it, read it and judge it. Always compiled: it is only data.
use gpui::{FocusHandle, ScrollHandle};
use serde_json::Value;
use std::collections::BTreeMap;

/// What the element is, as a screen reader or a person would put it. The audits treat the interactive ones
/// ([`Role::is_control`]) as things to press: they need a name, a tap target and room of their own.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Role {
    /// The root of the window. Exactly one per window: it marks where a frame starts.
    Window,
    /// A box that only holds things (a row, a card, a column).
    Group,
    Text,
    Heading,
    Image,
    Icon,
    Button,
    Tab,
    Switch,
    Checkbox,
    Slider,
    TextInput,
    List,
    ListItem,
    Scroll,
    Menu,
    MenuItem,
    /// A sheet, dialog or popover: it floats over the page and owns a layer.
    Dialog,
    Toast,
    Separator,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Role::Window => "window",
            Role::Group => "group",
            Role::Text => "text",
            Role::Heading => "heading",
            Role::Image => "image",
            Role::Icon => "icon",
            Role::Button => "button",
            Role::Tab => "tab",
            Role::Switch => "switch",
            Role::Checkbox => "checkbox",
            Role::Slider => "slider",
            Role::TextInput => "text_input",
            Role::List => "list",
            Role::ListItem => "list_item",
            Role::Scroll => "scroll",
            Role::Menu => "menu",
            Role::MenuItem => "menu_item",
            Role::Dialog => "dialog",
            Role::Toast => "toast",
            Role::Separator => "separator",
        }
    }

    /// Something a person presses, types into or drags.
    pub fn is_control(self) -> bool {
        matches!(self, Role::Button | Role::Tab | Role::Switch | Role::Checkbox | Role::Slider | Role::TextInput | Role::MenuItem)
    }

    /// Something that shows words.
    pub fn is_text(self) -> bool {
        matches!(self, Role::Text | Role::Heading)
    }
}

/// A scroll container's handle, kept to read its offset and extent each frame.
#[derive(Clone)]
pub struct ScrollSource(pub ScrollHandle);

/// The description of one inspectable element. Build it with the constructor that fits ([`Inspect::button`],
/// [`Inspect::text`], [`Inspect::new`]), refine it with the builder methods, hand it to `.inspect(..)` or [`inspect!`](crate::inspect).
#[derive(Clone)]
pub struct Inspect {
    pub id: String,
    pub role: Role,
    /// The accessible name: what a screen reader says. For text it is the words shown.
    pub name: Option<String>,
    pub enabled: bool,
    /// Free state a test can read or wait on: `selected`, `checked`, `value`, `open`...
    pub state: BTreeMap<String, Value>,
    /// The layer the element is drawn in when it is not the page's: a sheet, a menu, a toast. Descendants inherit it.
    /// Overlap is judged within a layer only.
    pub layer: Option<String>,
    /// The words are meant to end in an ellipsis when they do not fit.
    pub truncates: bool,
    /// A picture that is only decoration (no name needed) or one that is a stand-in until the real one loads.
    pub decorative: bool,
    pub placeholder: bool,
    /// A text input whose words are secret: the tree says it is a password and never gives its value, so a screen reader
    /// says "password" and reads no words. Set by [`Inspect::password`].
    pub password: bool,
    /// Keeps overlap judgments quiet for an element laid over its parent on purpose (a badge on a card).
    pub overlays_parent: bool,
    pub focus: Option<FocusHandle>,
    pub scroll: Option<ScrollSource>,
    /// Where `.inspect(..)` was written.
    pub src: &'static std::panic::Location<'static>,
}

impl Inspect {
    #[track_caller]
    pub fn new(role: Role, id: impl Into<String>) -> Self {
        Inspect {
            id: id.into(),
            role,
            name: None,
            enabled: true,
            state: BTreeMap::new(),
            layer: None,
            truncates: false,
            decorative: false,
            placeholder: false,
            password: false,
            overlays_parent: false,
            focus: None,
            scroll: None,
            src: std::panic::Location::caller(),
        }
    }

    #[track_caller]
    pub fn window(id: impl Into<String>, title: impl Into<String>) -> Self {
        Self::new(Role::Window, id).name(title)
    }
    #[track_caller]
    pub fn group(id: impl Into<String>) -> Self {
        Self::new(Role::Group, id)
    }
    #[track_caller]
    pub fn button(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self::new(Role::Button, id).name(name)
    }
    #[track_caller]
    pub fn tab(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self::new(Role::Tab, id).name(name)
    }
    #[track_caller]
    pub fn switch(id: impl Into<String>, name: impl Into<String>, on: bool) -> Self {
        Self::new(Role::Switch, id).name(name).state("checked", on)
    }
    #[track_caller]
    pub fn text(id: impl Into<String>, words: impl Into<String>) -> Self {
        Self::new(Role::Text, id).name(words)
    }
    #[track_caller]
    pub fn heading(id: impl Into<String>, words: impl Into<String>) -> Self {
        Self::new(Role::Heading, id).name(words)
    }
    #[track_caller]
    pub fn input(id: impl Into<String>, name: impl Into<String>, value: impl Into<String>) -> Self {
        Self::new(Role::TextInput, id).name(name).state("value", value.into())
    }
    /// A password: a text input whose words are secret. It has the state `password: true` and no value, in the tree and
    /// to UI Automation alike.
    #[track_caller]
    pub fn password(id: impl Into<String>, name: impl Into<String>) -> Self {
        let mut spec = Self::new(Role::TextInput, id).name(name).state("password", true);
        spec.password = true;
        spec
    }
    #[track_caller]
    pub fn list(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self::new(Role::List, id).name(name)
    }
    #[track_caller]
    pub fn item(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self::new(Role::ListItem, id).name(name)
    }
    #[track_caller]
    pub fn image(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self::new(Role::Image, id).name(name)
    }
    #[track_caller]
    pub fn icon(id: impl Into<String>) -> Self {
        Self::new(Role::Icon, id).decorative()
    }
    /// A floating sheet, dialog or menu: it owns the layer `id`.
    #[track_caller]
    pub fn dialog(id: impl Into<String>, name: impl Into<String>) -> Self {
        let id = id.into();
        Self::new(Role::Dialog, id.clone()).name(name).layer(id)
    }

    /// The state as the tree shows it: a password never shows a `value`, whatever was set on it.
    pub(crate) fn tree_state(&self) -> BTreeMap<String, Value> {
        let mut state = self.state.clone();
        if self.password {
            state.remove("value");
        }
        state
    }
    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }
    pub fn disabled(mut self) -> Self {
        self.enabled = false;
        self
    }
    pub fn enabled(mut self, on: bool) -> Self {
        self.enabled = on;
        self
    }
    pub fn state(mut self, key: impl Into<String>, value: impl Into<Value>) -> Self {
        self.state.insert(key.into(), value.into());
        self
    }
    pub fn layer(mut self, layer: impl Into<String>) -> Self {
        self.layer = Some(layer.into());
        self
    }
    pub fn truncates(mut self) -> Self {
        self.truncates = true;
        self
    }
    pub fn decorative(mut self) -> Self {
        self.decorative = true;
        self
    }
    pub fn placeholder(mut self) -> Self {
        self.placeholder = true;
        self
    }
    pub fn overlays_parent(mut self) -> Self {
        self.overlays_parent = true;
        self
    }
    /// Reads focus (focused now, tab stop, tab index) from this handle each frame.
    pub fn focus(mut self, handle: &FocusHandle) -> Self {
        self.focus = Some(handle.clone());
        self
    }
    /// Marks the element a scroll container and reads its offset and extent from `handle` each frame.
    pub fn scrolls(mut self, handle: &ScrollHandle) -> Self {
        self.scroll = Some(ScrollSource(handle.clone()));
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_password_says_so_and_carries_no_value() {
        let spec = Inspect::password("pw", "Password");
        assert_eq!(spec.role, Role::TextInput);
        assert_eq!(spec.name.as_deref(), Some("Password"));
        assert!(spec.password);
        assert_eq!(spec.state.get("password"), Some(&Value::Bool(true)));
        // Even a value set on it by hand never reaches the tree.
        let spec = spec.state("value", "hunter2");
        assert!(!spec.tree_state().contains_key("value"));
        assert_eq!(spec.tree_state().get("password"), Some(&Value::Bool(true)));
    }

    #[test]
    fn a_plain_input_keeps_its_value() {
        let spec = Inspect::input("name", "Name", "Ada");
        assert!(!spec.password);
        assert_eq!(spec.tree_state().get("value"), Some(&Value::from("Ada")));
    }
}
