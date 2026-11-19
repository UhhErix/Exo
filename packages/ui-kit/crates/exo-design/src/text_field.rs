//! A one-line text field: caret, selection, clipboard, IME. The editing core is gpui's `examples/input.rs` (Apache-2.0), reused
//! as is; what is Exo's is the look (DESIGN.md › Controls: small glass, words on the true center, Muted placeholder), Ctrl keys
//! and `TextField::new`.

use std::ops::Range;

use crate::t;
use exo_inspect::{Inspect, InspectExt};
use gpui::{
    App, Bounds, ClipboardItem, Context, CursorStyle, ElementId, ElementInputHandler, Entity, EntityInputHandler, FocusHandle,
    Focusable, GlobalElementId, KeyBinding, LayoutId, MouseButton, MouseDownEvent, MouseMoveEvent, MouseUpEvent, PaintQuad,
    Pixels, Point, ShapedLine, SharedString, Style, TextRun, UTF16Selection, UnderlineStyle, Window, actions, div, fill, point,
    prelude::*, px, relative, size,
};
use unicode_segmentation::*;

actions!(
    exo_text_field,
    [
        Backspace,
        Delete,
        Left,
        Right,
        SelectLeft,
        SelectRight,
        SelectAll,
        Home,
        End,
        ShowCharacterPalette,
        Paste,
        Cut,
        Copy,
        ]
);

/// The mark a password draws for each character: one per character, so a multi-byte character is one mark.
const MARK: char = '\u{2022}';

/// The drawn mask of `text`: one mark per character.
fn mask(text: &str) -> String {
    MARK.to_string().repeat(text.chars().count())
}

/// The byte offset in the mask of the byte offset `real` in `text`. Every mark is [`MARK`]'s 3 bytes long.
fn mask_offset(text: &str, real: usize) -> usize {
    text[..real].chars().count() * MARK.len_utf8()
}

/// The byte offset in `text` of the byte offset `shown` in its mask; past the end, the end.
fn unmask_offset(text: &str, shown: usize) -> usize {
    text.char_indices().nth(shown / MARK.len_utf8()).map_or(text.len(), |(i, _)| i)
}

/// What Copy and Cut put on the clipboard for `range` of `content`: nothing for a password, and nothing for no selection.
fn copy_payload(masked: bool, content: &str, range: &Range<usize>) -> Option<String> {
    (!masked && !range.is_empty()).then(|| content[range.clone()].to_string())
}

pub struct TextField {
    focus_handle: FocusHandle,
    content: SharedString,
    placeholder: SharedString,
    selected_range: Range<usize>,
    selection_reversed: bool,
    marked_range: Option<Range<usize>>,
    last_layout: Option<ShapedLine>,
    last_bounds: Option<Bounds<Pixels>>,
    is_selecting: bool,
    /// A password: every character is drawn as a mark, and Copy and Cut do nothing. See [`TextField::password`].
    masked: bool,
}

impl TextField {
    fn left(&mut self, _: &Left, _: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.move_to(self.previous_boundary(self.cursor_offset()), cx);
        } else {
            self.move_to(self.selected_range.start, cx)
        }
    }

    fn right(&mut self, _: &Right, _: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.move_to(self.next_boundary(self.selected_range.end), cx);
        } else {
            self.move_to(self.selected_range.end, cx)
        }
    }

    fn select_left(&mut self, _: &SelectLeft, _: &mut Window, cx: &mut Context<Self>) {
        self.select_to(self.previous_boundary(self.cursor_offset()), cx);
    }

    fn select_right(&mut self, _: &SelectRight, _: &mut Window, cx: &mut Context<Self>) {
        self.select_to(self.next_boundary(self.cursor_offset()), cx);
    }

    fn select_all(&mut self, _: &SelectAll, _: &mut Window, cx: &mut Context<Self>) {
        self.move_to(0, cx);
        self.select_to(self.content.len(), cx)
    }

    fn home(&mut self, _: &Home, _: &mut Window, cx: &mut Context<Self>) {
        self.move_to(0, cx);
    }

    fn end(&mut self, _: &End, _: &mut Window, cx: &mut Context<Self>) {
        self.move_to(self.content.len(), cx);
    }

    fn backspace(&mut self, _: &Backspace, window: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.select_to(self.previous_boundary(self.cursor_offset()), cx)
        }
        self.replace_text_in_range(None, "", window, cx)
    }

    fn delete(&mut self, _: &Delete, window: &mut Window, cx: &mut Context<Self>) {
        if self.selected_range.is_empty() {
            self.select_to(self.next_boundary(self.cursor_offset()), cx)
        }
        self.replace_text_in_range(None, "", window, cx)
    }

    fn on_mouse_down(
        &mut self,
        event: &MouseDownEvent,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        self.is_selecting = true;

        if event.modifiers.shift {
            self.select_to(self.index_for_mouse_position(event.position), cx);
        } else {
            self.move_to(self.index_for_mouse_position(event.position), cx)
        }
    }

    fn on_mouse_up(&mut self, _: &MouseUpEvent, _window: &mut Window, _: &mut Context<Self>) {
        self.is_selecting = false;
    }

    fn on_mouse_move(&mut self, event: &MouseMoveEvent, _: &mut Window, cx: &mut Context<Self>) {
        if self.is_selecting {
            self.select_to(self.index_for_mouse_position(event.position), cx);
        }
    }

    fn show_character_palette(
        &mut self,
        _: &ShowCharacterPalette,
        window: &mut Window,
        _: &mut Context<Self>,
    ) {
        window.show_character_palette();
    }

    fn paste(&mut self, _: &Paste, window: &mut Window, cx: &mut Context<Self>) {
        if let Some(text) = cx.read_from_clipboard().and_then(|item| item.text()) {
            self.replace_text_in_range(None, &text.replace("\n", " "), window, cx);
        }
    }

    fn copy(&mut self, _: &Copy, _: &mut Window, cx: &mut Context<Self>) {
        if let Some(text) = copy_payload(self.masked, &self.content, &self.selected_range) {
            cx.write_to_clipboard(ClipboardItem::new_string(text));
        }
    }
    fn cut(&mut self, _: &Cut, window: &mut Window, cx: &mut Context<Self>) {
        if let Some(text) = copy_payload(self.masked, &self.content, &self.selected_range) {
            cx.write_to_clipboard(ClipboardItem::new_string(text));
            self.replace_text_in_range(None, "", window, cx)
        }
    }

    fn move_to(&mut self, offset: usize, cx: &mut Context<Self>) {
        self.selected_range = offset..offset;
        cx.notify()
    }

    fn cursor_offset(&self) -> usize {
        if self.selection_reversed {
            self.selected_range.start
        } else {
            self.selected_range.end
        }
    }

    fn index_for_mouse_position(&self, position: Point<Pixels>) -> usize {
        if self.content.is_empty() {
            return 0;
        }

        let (Some(bounds), Some(line)) = (self.last_bounds.as_ref(), self.last_layout.as_ref())
        else {
            return 0;
        };
        if position.y < bounds.top() {
            return 0;
        }
        if position.y > bounds.bottom() {
            return self.content.len();
        }
        self.real_at(line.closest_index_for_x(position.x - bounds.left()))
    }

    /// Where the byte offset `real` of the words is drawn: the same offset, or in a password, the mask's.
    fn shown_at(&self, real: usize) -> usize {
        if self.masked { mask_offset(&self.content, real) } else { real }
    }

    /// The byte offset of the words at the drawn offset `shown`.
    fn real_at(&self, shown: usize) -> usize {
        if self.masked { unmask_offset(&self.content, shown) } else { shown }
    }

    /// The words as they are drawn: the mask of a password, else the words.
    fn drawn_text(&self) -> SharedString {
        if self.masked { mask(&self.content).into() } else { self.content.clone() }
    }

    fn select_to(&mut self, offset: usize, cx: &mut Context<Self>) {
        if self.selection_reversed {
            self.selected_range.start = offset
        } else {
            self.selected_range.end = offset
        };
        if self.selected_range.end < self.selected_range.start {
            self.selection_reversed = !self.selection_reversed;
            self.selected_range = self.selected_range.end..self.selected_range.start;
        }
        cx.notify()
    }

    fn offset_from_utf16(&self, offset: usize) -> usize {
        // A password's platform positions count marks, one unit each.
        if self.masked {
            return unmask_offset(&self.content, offset * MARK.len_utf8());
        }
        let mut utf8_offset = 0;
        let mut utf16_count = 0;

        for ch in self.content.chars() {
            if utf16_count >= offset {
                break;
            }
            utf16_count += ch.len_utf16();
            utf8_offset += ch.len_utf8();
        }

        utf8_offset
    }

    fn offset_to_utf16(&self, offset: usize) -> usize {
        if self.masked {
            return mask_offset(&self.content, offset) / MARK.len_utf8();
        }
        let mut utf16_offset = 0;
        let mut utf8_count = 0;

        for ch in self.content.chars() {
            if utf8_count >= offset {
                break;
            }
            utf8_count += ch.len_utf8();
            utf16_offset += ch.len_utf16();
        }

        utf16_offset
    }

    fn range_to_utf16(&self, range: &Range<usize>) -> Range<usize> {
        self.offset_to_utf16(range.start)..self.offset_to_utf16(range.end)
    }

    fn range_from_utf16(&self, range_utf16: &Range<usize>) -> Range<usize> {
        self.offset_from_utf16(range_utf16.start)..self.offset_from_utf16(range_utf16.end)
    }

    fn previous_boundary(&self, offset: usize) -> usize {
        if self.masked {
            return self.content[..offset].char_indices().next_back().map_or(0, |(i, _)| i);
        }
        self.content
            .grapheme_indices(true)
            .rev()
            .find_map(|(idx, _)| (idx < offset).then_some(idx))
            .unwrap_or(0)
    }

    fn next_boundary(&self, offset: usize) -> usize {
        if self.masked {
            return self.content[offset..].char_indices().nth(1).map_or(self.content.len(), |(i, _)| offset + i);
        }
        self.content
            .grapheme_indices(true)
            .find_map(|(idx, _)| (idx > offset).then_some(idx))
            .unwrap_or(self.content.len())
    }

}

impl EntityInputHandler for TextField {
    fn text_for_range(
        &mut self,
        range_utf16: Range<usize>,
        actual_range: &mut Option<Range<usize>>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<String> {
        let range = self.range_from_utf16(&range_utf16);
        actual_range.replace(self.range_to_utf16(&range));
        // A password hands the input method its marks, never its words.
        if self.masked {
            let drawn = self.drawn_text();
            return Some(drawn[self.shown_at(range.start)..self.shown_at(range.end)].to_string());
        }
        Some(self.content[range].to_string())
    }

    fn selected_text_range(
        &mut self,
        _ignore_disabled_input: bool,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<UTF16Selection> {
        Some(UTF16Selection {
            range: self.range_to_utf16(&self.selected_range),
            reversed: self.selection_reversed,
        })
    }

    fn marked_text_range(
        &self,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<Range<usize>> {
        self.marked_range
            .as_ref()
            .map(|range| self.range_to_utf16(range))
    }

    fn unmark_text(&mut self, _window: &mut Window, _cx: &mut Context<Self>) {
        self.marked_range = None;
    }

    fn replace_text_in_range(
        &mut self,
        range_utf16: Option<Range<usize>>,
        new_text: &str,
        _: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let range = range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .or(self.marked_range.clone())
            .unwrap_or(self.selected_range.clone());

        self.content =
            (self.content[0..range.start].to_owned() + new_text + &self.content[range.end..])
                .into();
        self.selected_range = range.start + new_text.len()..range.start + new_text.len();
        self.marked_range.take();
        cx.emit(Edited);
        cx.notify();
    }

    fn replace_and_mark_text_in_range(
        &mut self,
        range_utf16: Option<Range<usize>>,
        new_text: &str,
        new_selected_range_utf16: Option<Range<usize>>,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let range = range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .or(self.marked_range.clone())
            .unwrap_or(self.selected_range.clone());

        self.content =
            (self.content[0..range.start].to_owned() + new_text + &self.content[range.end..])
                .into();
        if !new_text.is_empty() {
            self.marked_range = Some(range.start..range.start + new_text.len());
        } else {
            self.marked_range = None;
        }
        self.selected_range = new_selected_range_utf16
            .as_ref()
            .map(|range_utf16| self.range_from_utf16(range_utf16))
            .map(|new_range| new_range.start + range.start..new_range.end + range.end)
            .unwrap_or_else(|| range.start + new_text.len()..range.start + new_text.len());

        cx.emit(Edited);
        cx.notify();
    }

    fn bounds_for_range(
        &mut self,
        range_utf16: Range<usize>,
        bounds: Bounds<Pixels>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<Bounds<Pixels>> {
        let range = self.range_from_utf16(&range_utf16);
        let (start, end) = (self.shown_at(range.start), self.shown_at(range.end));
        let last_layout = self.last_layout.as_ref()?;
        Some(Bounds::from_corners(
            point(bounds.left() + last_layout.x_for_index(start), bounds.top()),
            point(bounds.left() + last_layout.x_for_index(end), bounds.bottom()),
        ))
    }

    fn character_index_for_point(
        &mut self,
        point: gpui::Point<Pixels>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<usize> {
        let line_point = self.last_bounds?.localize(&point)?;
        let last_layout = self.last_layout.as_ref()?;

        assert_eq!(last_layout.text, self.drawn_text());
        let utf8_index = self.real_at(last_layout.index_for_x(point.x - line_point.x)?);
        Some(self.offset_to_utf16(utf8_index))
    }
}

struct TextElement {
    input: Entity<TextField>,
}

struct PrepaintState {
    line: Option<ShapedLine>,
    cursor: Option<PaintQuad>,
    selection: Option<PaintQuad>,
}

impl IntoElement for TextElement {
    type Element = Self;

    fn into_element(self) -> Self::Element {
        self
    }
}

impl Element for TextElement {
    type RequestLayoutState = ();
    type PrepaintState = PrepaintState;

    fn id(&self) -> Option<ElementId> {
        None
    }

    fn source_location(&self) -> Option<&'static core::panic::Location<'static>> {
        None
    }

    fn request_layout(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        window: &mut Window,
        cx: &mut App,
    ) -> (LayoutId, Self::RequestLayoutState) {
        let mut style = Style::default();
        style.size.width = relative(1.).into();
        style.size.height = window.line_height().into();
        (window.request_layout(style, [], cx), ())
    }

    fn prepaint(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        bounds: Bounds<Pixels>,
        _request_layout: &mut Self::RequestLayoutState,
        window: &mut Window,
        cx: &mut App,
    ) -> Self::PrepaintState {
        let input = self.input.read(cx);
        let selected_range = input.selected_range.clone();
        let cursor = input.cursor_offset();
        let style = window.text_style();

        let (display_text, text_color) = if input.content.is_empty() {
            (input.placeholder.clone(), t::MUTED.into())
        } else {
            (input.drawn_text(), style.color)
        };

        let run = TextRun {
            len: display_text.len(),
            font: style.font(),
            color: text_color,
            background_color: None,
            underline: None,
            strikethrough: None,
        };
        let marked = input.marked_range.as_ref().map(|r| input.shown_at(r.start)..input.shown_at(r.end));
        let runs = if let Some(marked_range) = marked {
            vec![
                TextRun {
                    len: marked_range.start,
                    ..run.clone()
                },
                TextRun {
                    len: marked_range.end - marked_range.start,
                    underline: Some(UnderlineStyle {
                        color: Some(run.color),
                        thickness: px(1.0),
                        wavy: false,
                    }),
                    ..run.clone()
                },
                TextRun {
                    len: display_text.len() - marked_range.end,
                    ..run
                },
            ]
            .into_iter()
            .filter(|run| run.len > 0)
            .collect()
        } else {
            vec![run]
        };

        let font_size = style.font_size.to_pixels(window.rem_size());
        let line = window
            .text_system()
            .shape_line(display_text, font_size, &runs, None);

        let cursor_pos = line.x_for_index(input.shown_at(cursor));
        let (selection, cursor) = if selected_range.is_empty() {
            (
                None,
                Some(fill(
                    Bounds::new(
                        point(bounds.left() + cursor_pos, bounds.top()),
                        size(px(2.), bounds.bottom() - bounds.top()),
                    ),
                    t::FG,
                )),
            )
        } else {
            (
                Some(fill(
                    Bounds::from_corners(
                        point(
                            bounds.left() + line.x_for_index(input.shown_at(selected_range.start)),
                            bounds.top(),
                        ),
                        point(
                            bounds.left() + line.x_for_index(input.shown_at(selected_range.end)),
                            bounds.bottom(),
                        ),
                    ),
                    t::SELECTED,
                )),
                None,
            )
        };
        PrepaintState {
            line: Some(line),
            cursor,
            selection,
        }
    }

    fn paint(
        &mut self,
        _id: Option<&GlobalElementId>,
        _inspector_id: Option<&gpui::InspectorElementId>,
        bounds: Bounds<Pixels>,
        _request_layout: &mut Self::RequestLayoutState,
        prepaint: &mut Self::PrepaintState,
        window: &mut Window,
        cx: &mut App,
    ) {
        let focus_handle = self.input.read(cx).focus_handle.clone();
        window.handle_input(
            &focus_handle,
            ElementInputHandler::new(bounds, self.input.clone()),
            cx,
        );
        if let Some(selection) = prepaint.selection.take() {
            window.paint_quad(selection)
        }
        let line = prepaint.line.take().unwrap();
        line.paint(bounds.origin, window.line_height(), window, cx)
            .unwrap();

        if focus_handle.is_focused(window)
            && let Some(cursor) = prepaint.cursor.take()
        {
            window.paint_quad(cursor);
        }

        self.input.update(cx, |input, _cx| {
            input.last_layout = Some(line);
            input.last_bounds = Some(bounds);
        });
    }
}

impl Render for TextField {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let field = div()
            .flex()
            .key_context("TextField")
            .track_focus(&self.focus_handle(cx))
            .cursor(CursorStyle::IBeam)
            .on_action(cx.listener(Self::backspace))
            .on_action(cx.listener(Self::delete))
            .on_action(cx.listener(Self::left))
            .on_action(cx.listener(Self::right))
            .on_action(cx.listener(Self::select_left))
            .on_action(cx.listener(Self::select_right))
            .on_action(cx.listener(Self::select_all))
            .on_action(cx.listener(Self::home))
            .on_action(cx.listener(Self::end))
            .on_action(cx.listener(Self::show_character_palette))
            .on_action(cx.listener(Self::paste))
            .on_action(cx.listener(Self::cut))
            .on_action(cx.listener(Self::copy))
            .on_mouse_down(MouseButton::Left, cx.listener(Self::on_mouse_down))
            .on_mouse_up(MouseButton::Left, cx.listener(Self::on_mouse_up))
            .on_mouse_up_out(MouseButton::Left, cx.listener(Self::on_mouse_up))
            .on_mouse_move(cx.listener(Self::on_mouse_move))
            .relative()
            .h(px(t::BUTTON))
            .w_full()
            .items_center()
            .px(px(12.0))
            .rounded(px(t::PILL))
            .border_1()
            .border_color(t::RIM)
            .text_color(t::FG)
            .text_size(px(t::TEXT_BODY))
            .line_height(px(t::TEXT_BODY + 4.0))
            .child(crate::glass::backing(t::SMALL_GLASS, t::PILL, None))
            .child(TextElement { input: cx.entity() });
        if self.masked {
            // A password says so to the inspect tree and to UI Automation, with no value.
            field.inspect(Inspect::password(format!("password-{}", self.placeholder), self.placeholder.to_string())).into_any_element()
        } else {
            field.into_any_element()
        }
    }
}

impl Focusable for TextField {
    fn focus_handle(&self, _: &App) -> FocusHandle {
        self.focus_handle.clone()
    }
}

impl TextField {
    pub fn new(placeholder: impl Into<SharedString>, cx: &mut Context<Self>) -> Self {
        Self {
            focus_handle: cx.focus_handle(),
            content: SharedString::default(),
            placeholder: placeholder.into(),
            selected_range: 0..0,
            selection_reversed: false,
            marked_range: None,
            last_layout: None,
            last_bounds: None,
            is_selecting: false,
            masked: false,
        }
    }

    /// A password field: each character is drawn as a mark (U+2022), the caret and selection follow the marks, Copy and
    /// Cut do nothing (Paste works), and the inspect tree says it is a password with no value. `text()` still returns
    /// the words, for the caller that uses them.
    pub fn password(placeholder: impl Into<SharedString>, cx: &mut Context<Self>) -> Self {
        Self { masked: true, ..Self::new(placeholder, cx) }
    }

    pub fn text(&self) -> &SharedString {
        &self.content
    }

    /// Replaces the words, the caret at their end.
    pub fn set_text(&mut self, text: impl Into<SharedString>, cx: &mut Context<Self>) {
        self.content = text.into();
        self.selected_range = self.content.len()..self.content.len();
        self.marked_range = None;
        cx.emit(Edited);
        cx.notify();
    }

    /// Everything selected, so typing replaces it (a name ready to type over).
    pub fn select_everything(&mut self, cx: &mut Context<Self>) {
        self.selected_range = 0..self.content.len();
        cx.notify();
    }
}

/// The words changed (typed, pasted, deleted or set).
pub struct Edited;
impl gpui::EventEmitter<Edited> for TextField {}

pub(crate) fn bind_keys(cx: &mut App) {
    const CONTEXT: Option<&str> = Some("TextField");
    cx.bind_keys([
        KeyBinding::new("backspace", Backspace, CONTEXT),
        KeyBinding::new("delete", Delete, CONTEXT),
        KeyBinding::new("left", Left, CONTEXT),
        KeyBinding::new("right", Right, CONTEXT),
        KeyBinding::new("shift-left", SelectLeft, CONTEXT),
        KeyBinding::new("shift-right", SelectRight, CONTEXT),
        KeyBinding::new("ctrl-a", SelectAll, CONTEXT),
        KeyBinding::new("ctrl-v", Paste, CONTEXT),
        KeyBinding::new("ctrl-c", Copy, CONTEXT),
        KeyBinding::new("ctrl-x", Cut, CONTEXT),
        KeyBinding::new("home", Home, CONTEXT),
        KeyBinding::new("end", End, CONTEXT),
    ]);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_password_draws_one_mark_per_character() {
        assert_eq!(mask(""), "");
        assert_eq!(mask("abc"), "\u{2022}\u{2022}\u{2022}");
        // 'ä' is 2 bytes and '🔑' 4 bytes; each is still one mark of 3 bytes.
        assert_eq!(mask("pä🔑").chars().count(), 3);
        assert_eq!(mask("pä🔑").len(), 9);
    }

    #[test]
    fn the_caret_follows_the_marks() {
        let text = "aä🔑b"; // bytes: a 0..1, ä 1..3, 🔑 3..7, b 7..8
        assert_eq!(mask_offset(text, 0), 0);
        assert_eq!(mask_offset(text, 1), 3);
        assert_eq!(mask_offset(text, 3), 6);
        assert_eq!(mask_offset(text, 7), 9);
        assert_eq!(mask_offset(text, 8), 12);
        for real in [0, 1, 3, 7, 8] {
            assert_eq!(unmask_offset(text, mask_offset(text, real)), real);
        }
        // Past the end is the end.
        assert_eq!(unmask_offset(text, 99), 8);
        // The platform counts one UTF-16 unit per mark, so the emoji is one unit here, not two.
        assert_eq!(mask_offset(text, 7) / MARK.len_utf8(), 3);
    }

    #[test]
    fn a_password_gives_nothing_to_the_clipboard() {
        assert_eq!(copy_payload(false, "hunter2", &(1..4)), Some("unt".to_string()));
        assert_eq!(copy_payload(true, "hunter2", &(1..4)), None);
        assert_eq!(copy_payload(false, "hunter2", &(2..2)), None);
    }
}
