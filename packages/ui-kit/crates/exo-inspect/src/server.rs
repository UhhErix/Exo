//! The test server: newline-delimited JSON-RPC over a named pipe, for suites that find elements by what they are.
//!
//! Built only with the `testkit` feature, and listening only when `EXO_UI_TEST=1` and `EXO_UI_TEST_TOKEN` (8+
//! characters) are set. The pipe is `\\.\pipe\<EXO_UI_TEST_PIPE>` (default `exo-ui-test-<pid>`), owner-only and
//! local-only; the first request on a connection is `hello` with the token.
//!
//! Every method runs on GPUI's thread (a foreground task); the pipe thread only carries lines. Input is posted to the
//! window's own message queue (the Win32 messages a mouse would cause, or GPUI's keystroke dispatch), so it takes the
//! app's real input path without the cursor, the foreground or `SendInput`: nothing on the desktop moves or loses focus.
//!
//! | Method | Params | Answer |
//! | --- | --- | --- |
//! | `tree` | | `{ frame, window, nodes: [...] }`, after a fresh frame |
//! | `wait_for` | selector, `exists`, `state`, `enabled`, `count`, `timeout_ms` | `{ ok, waited_ms, count, node }` |
//! | `settle` | `quiet_ms`, `timeout_ms` | `{ waited_ms }`: until no frame for `quiet_ms` |
//! | `click`, `hover` | selector, or `x`/`y` (logical); `button: "right"` | `{ x, y, target }` |
//! | `wheel` | selector or point, `notches` (negative scrolls down) | |
//! | `key` | `key`: a chord like `ctrl+k` | |
//! | `type` | `text` | |
//! | `close` | | asks the window to close, as its Close button would |
//! | anything else | | the app's own methods, if it added any ([`extend`]) |
//!
//! A selector is any of `id`, `name`, `name_contains`, `role`, `layer`, plus `index` when several match. Only painted,
//! unclipped elements match unless `any: true`.
use crate::registry::{self, Entry};
use anyhow::{Result, anyhow};
use futures::StreamExt;
use futures::channel::mpsc::{UnboundedSender, unbounded};
use gpui::{AnyWindowHandle, App, AsyncApp, Keystroke, Modifiers, Window};
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Write};
use std::os::windows::io::FromRawHandle;
use std::sync::mpsc;
use std::time::{Duration, Instant};
use windows::Win32::Foundation::{GetLastError, HANDLE, HLOCAL, HWND, LPARAM, LocalFree, POINT, WPARAM};
use windows::Win32::Graphics::Gdi::{ClientToScreen, MONITOR_DEFAULTTONEAREST, MONITOR_DEFAULTTOPRIMARY, MonitorFromPoint, MonitorFromWindow};
use windows::Win32::Security::Authorization::{ConvertStringSecurityDescriptorToSecurityDescriptorW, SDDL_REVISION_1};
use windows::Win32::Security::{PSECURITY_DESCRIPTOR, SECURITY_ATTRIBUTES};
use windows::Win32::Storage::FileSystem::PIPE_ACCESS_DUPLEX;
use windows::Win32::System::Pipes::{ConnectNamedPipe, CreateNamedPipeW, PIPE_READMODE_BYTE, PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_BYTE, PIPE_WAIT};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, PostMessageW, WM_CLOSE, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MOUSEMOVE, WM_MOUSEWHEEL, WM_RBUTTONDOWN, WM_RBUTTONUP};
use windows::core::PCWSTR;

type R<T> = std::result::Result<T, String>;

struct Job {
    method: String,
    params: Value,
    reply: mpsc::Sender<R<Value>>,
}

/// Starts the server when `EXO_UI_TEST=1` and a token is set; call once after the first window opens. Returns whether
/// it listens.
pub fn attach(cx: &mut App) -> bool {
    if std::env::var("EXO_UI_TEST").ok().as_deref() != Some("1") {
        return false;
    }
    let Some(token) = std::env::var("EXO_UI_TEST_TOKEN").ok().filter(|t| t.len() >= 8) else {
        eprintln!("exo-inspect: EXO_UI_TEST=1 without an EXO_UI_TEST_TOKEN of 8+ characters; not listening");
        return false;
    };
    let name = std::env::var("EXO_UI_TEST_PIPE").unwrap_or_else(|_| format!("exo-ui-test-{}", std::process::id()));
    let pipe = format!(r"\\.\pipe\{name}");
    crate::start_reading(crate::TEST_SERVER);
    let (tx, mut rx) = unbounded::<Job>();
    std::thread::Builder::new().name("exo-inspect-server".into()).spawn(move || serve(&pipe, &token, tx)).expect("test server thread");
    cx.spawn(async move |cx| {
        while let Some(job) = rx.next().await {
            let answer = handle(cx, &job.method, job.params).await;
            let _ = job.reply.send(answer);
        }
    })
    .detach();
    // A frame now, so the tree exists before the first question.
    for w in cx.windows() {
        let _ = w.update(cx, |_, window, _| window.refresh());
    }
    true
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn create_pipe(name: &str) -> Result<HANDLE> {
    let wname = wide(name);
    unsafe {
        let mut sd = PSECURITY_DESCRIPTOR::default();
        // Protected DACL: generic all for the owner, nobody else.
        let sddl = wide("D:P(A;;GA;;;OW)");
        ConvertStringSecurityDescriptorToSecurityDescriptorW(PCWSTR(sddl.as_ptr()), SDDL_REVISION_1, &mut sd, None)?;
        let sa = SECURITY_ATTRIBUTES { nLength: size_of::<SECURITY_ATTRIBUTES>() as u32, lpSecurityDescriptor: sd.0, bInheritHandle: false.into() };
        let h = CreateNamedPipeW(
            PCWSTR(wname.as_ptr()),
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
            1,
            1 << 20,
            1 << 20,
            0,
            Some(&sa),
        );
        let _ = LocalFree(Some(HLOCAL(sd.0)));
        if h.is_invalid() {
            return Err(anyhow!("CreateNamedPipeW failed: {:?}", GetLastError()));
        }
        Ok(h)
    }
}

fn serve(pipe: &str, token: &str, tx: UnboundedSender<Job>) {
    loop {
        let handle = match create_pipe(pipe) {
            Ok(h) => h,
            Err(e) => {
                eprintln!("exo-inspect: {e}");
                return;
            }
        };
        // ERROR_PIPE_CONNECTED (535): the client got in between the create and the connect.
        if let Err(e) = unsafe { ConnectNamedPipe(handle, None) }
            && e.code().0 as u32 & 0xFFFF != 535
        {
            continue;
        }
        let file = unsafe { std::fs::File::from_raw_handle(handle.0) };
        let Ok(mut writer) = file.try_clone() else { continue };
        let mut authed = false;
        for line in BufReader::new(file).lines() {
            let Ok(line) = line else { break };
            if line.trim().is_empty() {
                continue;
            }
            let Ok(req) = serde_json::from_str::<Value>(&line) else {
                let _ = writeln!(writer, "{}", json!({ "id": null, "error": "bad JSON" }));
                continue;
            };
            let id = req["id"].clone();
            let method = req["method"].as_str().unwrap_or("").to_string();
            let params = req.get("params").cloned().unwrap_or(json!({}));
            let result = if method == "hello" {
                authed = params["token"].as_str() == Some(token);
                if authed { Ok(json!({ "pid": std::process::id() })) } else { Err("wrong token".to_string()) }
            } else if !authed {
                Err("say hello with the token first".to_string())
            } else {
                let (reply, answer) = mpsc::channel();
                if tx.unbounded_send(Job { method, params, reply }).is_err() {
                    return;
                }
                answer.recv().unwrap_or_else(|_| Err("the app is closing".into()))
            };
            let out = match result {
                Ok(v) => json!({ "id": id, "result": v }),
                Err(e) => json!({ "id": id, "error": e }),
            };
            if writeln!(writer, "{out}").is_err() {
                break;
            }
        }
    }
}

fn window_handle(app: &App) -> R<AnyWindowHandle> {
    app.windows().first().copied().ok_or_else(|| "the app has no window".to_string())
}

fn on_window<T>(cx: &mut AsyncApp, f: impl FnOnce(&mut Window, &mut App) -> R<T>) -> R<T> {
    cx.update(|app| {
        let handle = window_handle(app)?;
        handle.update(app, |_, window, app| f(window, app)).map_err(|e| e.to_string())?
    })
    .map_err(|e| e.to_string())?
}

async fn sleep(cx: &AsyncApp, ms: u64) {
    cx.background_executor().timer(Duration::from_millis(ms)).await;
}

fn hwnd_of(window: &Window) -> R<HWND> {
    match HasWindowHandle::window_handle(window).map_err(|e| e.to_string())?.as_raw() {
        RawWindowHandle::Win32(h) => Ok(HWND(h.hwnd.get() as *mut _)),
        _ => Err("not a Win32 window".into()),
    }
}

fn visible(e: &Entry) -> bool {
    e.painted && !e.hidden && e.bounds.intersect(&e.clip).area() > 0.0
}

/// Does this entry answer the selector?
fn matches(e: &Entry, p: &Value) -> bool {
    if !visible(e) && p["any"].as_bool() != Some(true) {
        return false;
    }
    let name = e.name.as_deref().unwrap_or("").to_lowercase();
    p["id"].as_str().is_none_or(|id| e.id == id)
        && p["name"].as_str().is_none_or(|n| name == n.to_lowercase())
        && p["name_contains"].as_str().is_none_or(|n| name.contains(&n.to_lowercase()))
        && p["role"].as_str().is_none_or(|r| e.role.as_str() == r)
        && p["layer"].as_str().is_none_or(|l| e.layer == l)
}

fn matching(key: u64, p: &Value) -> Vec<(usize, Entry)> {
    registry::with(|r| {
        r.windows
            .get(&key)
            .map(|f| f.entries.iter().enumerate().filter(|(_, e)| matches(e, p)).map(|(i, e)| (i, e.clone())).collect())
            .unwrap_or_default()
    })
}

fn selector_text(p: &Value) -> String {
    let parts: Vec<String> =
        ["id", "name", "name_contains", "role", "layer"].iter().filter_map(|k| p[*k].as_str().map(|v| format!("{k}={v:?}"))).collect();
    if parts.is_empty() { "{}".into() } else { parts.join(", ") }
}

/// One element for a selector, topmost first; several without `index` is an error that names them.
fn resolve_one(key: u64, p: &Value) -> R<Entry> {
    let mut found = matching(key, p);
    if found.is_empty() {
        return Err(format!("no visible element matches {}", selector_text(p)));
    }
    found.sort_by_key(|(_, e)| std::cmp::Reverse(e.order));
    if found.len() > 1 && p.get("index").is_none() {
        let list: Vec<String> = found.iter().take(6).map(|(i, e)| format!("#{i} {} {:?}", e.id, e.name.clone().unwrap_or_default())).collect();
        return Err(format!("{} elements match {}: {}; add index or narrow it", found.len(), selector_text(p), list.join(" | ")));
    }
    let index = p["index"].as_u64().unwrap_or(0) as usize;
    found.into_iter().nth(index).map(|(_, e)| e).ok_or_else(|| format!("index {index} is past the matches for {}", selector_text(p)))
}

/// The logical point to aim at: `x`/`y`, or the middle of the element's visible part.
fn target(key: u64, p: &Value) -> R<(f32, f32, Option<Entry>)> {
    if let (Some(x), Some(y)) = (p["x"].as_f64(), p["y"].as_f64()) {
        return Ok((x as f32, y as f32, None));
    }
    let e = resolve_one(key, p)?;
    let v = e.bounds.intersect(&e.clip);
    Ok((v.x + v.w / 2.0, v.y + v.h / 2.0, Some(e)))
}

fn lparam(x: i32, y: i32) -> LPARAM {
    LPARAM(((y as u16 as u32) << 16 | (x as u16 as u32)) as isize)
}

fn post(h: HWND, msg: u32, w: usize, l: LPARAM) -> R<()> {
    unsafe { PostMessageW(Some(h), msg, WPARAM(w), l) }.map_err(|e| e.to_string())
}

/// Until no frame has been drawn for `quiet_ms`, or `timeout_ms`.
/// The app's own test methods (a fake host's events, its call log): answered after the built-in ones. The handler gets the
/// method and params and returns None for a method it does not know.
pub fn extend(cx: &mut App, handler: impl Fn(&str, &Value, &mut App) -> Option<R<Value>> + 'static) {
    cx.default_global::<Extensions>().0.push(std::rc::Rc::new(handler));
}

type Handler = std::rc::Rc<dyn Fn(&str, &Value, &mut App) -> Option<R<Value>>>;

#[derive(Default)]
struct Extensions(Vec<Handler>);
impl gpui::Global for Extensions {}

async fn settle(cx: &mut AsyncApp, quiet_ms: u64, timeout_ms: u64) -> u64 {
    let start = Instant::now();
    sleep(cx, 32).await;
    loop {
        let waited = start.elapsed().as_millis() as u64;
        if registry::idle_ms().is_none_or(|i| i >= quiet_ms as f64) || waited >= timeout_ms {
            return waited;
        }
        sleep(cx, 8).await;
    }
}

fn key_of(window: &Window) -> u64 {
    registry::window_key(window)
}

async fn handle(cx: &mut AsyncApp, method: &str, p: Value) -> R<Value> {
    match method {
        "tree" => {
            let before = on_window(cx, |w, _| {
                w.refresh();
                Ok(registry::frame_number(key_of(w)))
            })?;
            for _ in 0..100 {
                sleep(cx, 5).await;
                if on_window(cx, |w, _| Ok(registry::frame_number(key_of(w))))? > before {
                    break;
                }
            }
            on_window(cx, |w, _| {
                let mut tree = registry::snapshot(key_of(w)).ok_or("no inspected frame yet: is the root `Inspect::window(..)`?")?;
                tree["active"] = json!(w.is_window_active());
                // Where the client area is on the desktop, in physical pixels: suites check the window kept off the main screen.
                let h = hwnd_of(w)?;
                let mut origin = POINT::default();
                let _ = unsafe { ClientToScreen(h, &mut origin) };
                // The main screen is the one at the desktop's origin.
                let on_main = unsafe { MonitorFromWindow(h, MONITOR_DEFAULTTONEAREST) == MonitorFromPoint(POINT::default(), MONITOR_DEFAULTTOPRIMARY) };
                tree["screen"] = json!({ "x": origin.x, "y": origin.y, "main": on_main });
                // In front of the desktop, as opposed to gpui's own idea of active (the thread's active window).
                tree["foreground"] = json!(unsafe { GetForegroundWindow() } == h);
                Ok(tree)
            })
        }

        "wait_for" => {
            let timeout = p["timeout_ms"].as_u64().unwrap_or(5000);
            let exists = p["exists"].as_bool().unwrap_or(true);
            let start = Instant::now();
            loop {
                let (ok, node, count) = on_window(cx, |w, _| {
                    let key = key_of(w);
                    let mut good = matching(key, &p);
                    if let Some(en) = p["enabled"].as_bool() {
                        good.retain(|(_, e)| e.enabled == en);
                    }
                    if let Some(st) = p["state"].as_object() {
                        good.retain(|(_, e)| st.iter().all(|(k, v)| e.state.get(k) == Some(v)));
                    }
                    let n = good.len();
                    let ok = match p["count"].as_u64() {
                        Some(c) => n as u64 == c,
                        None => (n > 0) == exists,
                    };
                    Ok((ok, good.first().map(|(i, e)| e.to_json(*i)), n))
                })?;
                if ok {
                    return Ok(json!({ "ok": true, "waited_ms": start.elapsed().as_millis() as u64, "count": count, "node": node }));
                }
                if start.elapsed().as_millis() as u64 >= timeout {
                    return Err(format!("timed out after {timeout} ms waiting for {} ({count} matched)", p));
                }
                sleep(cx, 16).await;
            }
        }

        "settle" => {
            let waited = settle(cx, p["quiet_ms"].as_u64().unwrap_or(100), p["timeout_ms"].as_u64().unwrap_or(3000)).await;
            Ok(json!({ "waited_ms": waited }))
        }

        "click" | "hover" | "wheel" => {
            let (x, y, e, h, scale) = on_window(cx, |w, _| {
                let (x, y, e) = target(key_of(w), &p)?;
                Ok((x, y, e, hwnd_of(w)?, w.scale_factor()))
            })?;
            let (px, py) = ((x * scale).round() as i32, (y * scale).round() as i32);
            // Modifiers held for this click only (`modifiers: ["shift"]`): set in this thread's own key state, which is what
            // gpui reads (GetKeyState), and in the message's MK_ bits. The desktop's keyboard is untouched.
            let held = Held::press(&p["modifiers"])?;
            let mk = held.mk();
            post(h, WM_MOUSEMOVE, mk, lparam(px, py))?;
            sleep(cx, 24).await;
            match method {
                "click" if p["button"] == "right" => {
                    post(h, WM_RBUTTONDOWN, 2 | mk, lparam(px, py))?;
                    sleep(cx, 30).await;
                    post(h, WM_RBUTTONUP, mk, lparam(px, py))?;
                }
                "click" => {
                    post(h, WM_LBUTTONDOWN, 1 | mk, lparam(px, py))?;
                    sleep(cx, 30).await;
                    post(h, WM_LBUTTONUP, mk, lparam(px, py))?;
                }
                "wheel" => {
                    // Wheel messages carry screen coordinates.
                    let mut s = POINT { x: px, y: py };
                    let _ = unsafe { ClientToScreen(h, &mut s) };
                    let notches = p["notches"].as_i64().unwrap_or(-1);
                    let delta = if notches < 0 { -120i32 } else { 120 };
                    for _ in 0..notches.unsigned_abs() {
                        post(h, WM_MOUSEWHEEL, (delta as i16 as u16 as usize) << 16, lparam(s.x, s.y))?;
                        sleep(cx, 16).await;
                    }
                }
                _ => {}
            }
            let settled = settle(cx, p["settle_ms"].as_u64().unwrap_or(80), 3000).await;
            drop(held);
            Ok(json!({ "x": x, "y": y, "target": e.map(|e| json!({ "id": e.id, "name": e.name })), "settled_ms": settled }))
        }

        "key" => {
            let chord = p["key"].as_str().ok_or("key needs a chord like \"ctrl-k\"")?.replace('+', "-").to_lowercase();
            let ks = Keystroke::parse(&chord).map_err(|e| format!("{chord:?}: {e}"))?;
            on_window(cx, move |w, a| {
                w.dispatch_keystroke(ks, a);
                Ok(())
            })?;
            settle(cx, 80, 3000).await;
            Ok(json!({ "key": chord }))
        }

        "type" => {
            let text = p["text"].as_str().ok_or("type needs text")?.to_string();
            for c in text.chars() {
                let ks = Keystroke { modifiers: Modifiers::default(), key: c.to_lowercase().to_string(), key_char: Some(c.to_string()) };
                on_window(cx, move |w, a| {
                    w.dispatch_keystroke(ks, a);
                    Ok(())
                })?;
                sleep(cx, 8).await;
            }
            settle(cx, 80, 3000).await;
            Ok(json!({ "typed": text.chars().count() }))
        }

        "close" => {
            let h = on_window(cx, |w, _| hwnd_of(w))?;
            post(h, WM_CLOSE, 0, LPARAM(0))?;
            Ok(json!({ "closing": true }))
        }

        other => cx
            .update(|app| {
                let handlers = app.try_global::<Extensions>().map(|e| e.0.clone()).unwrap_or_default();
                handlers.iter().find_map(|h| h(other, &p, app))
            })
            .map_err(|e| e.to_string())?
            .unwrap_or_else(|| Err(format!("unknown method {other:?}"))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_selector_names_only_what_was_given() {
        assert_eq!(selector_text(&json!({ "id": "play", "role": "button" })), "id=\"play\", role=\"button\"");
        assert_eq!(selector_text(&json!({})), "{}");
    }

    #[test]
    fn a_point_packs_as_windows_does() {
        assert_eq!(lparam(3, 2).0, 0x0002_0003);
        // Negative screen coordinates (a monitor left of the main one) keep their 16 bits.
        assert_eq!(lparam(-1, 0).0, 0xFFFF);
    }
}

/// Modifier keys held in the UI thread's key state for one input, and let go when dropped.
struct Held {
    keys: Vec<u8>,
    before: [u8; 256],
}

impl Held {
    fn press(names: &Value) -> Result<Self, String> {
        use windows::Win32::UI::Input::KeyboardAndMouse::{GetKeyboardState, SetKeyboardState};
        let names: Vec<String> = match names {
            Value::Null => vec![],
            Value::String(s) => s.split(['+', '-', ',']).map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty()).collect(),
            Value::Array(a) => a.iter().filter_map(|v| v.as_str()).map(str::to_lowercase).collect(),
            _ => return Err("modifiers is a list like [\"shift\"]".into()),
        };
        let mut keys = vec![];
        for name in &names {
            // The generic key and its left one, as a real press sets both.
            keys.extend_from_slice(match name.as_str() {
                "shift" => &[0x10, 0xA0],
                "ctrl" | "control" => &[0x11, 0xA2],
                "alt" => &[0x12, 0xA4],
                other => return Err(format!("unknown modifier {other:?}")),
            });
        }
        let mut before = [0u8; 256];
        if !keys.is_empty() {
            unsafe { GetKeyboardState(&mut before) }.map_err(|e| e.to_string())?;
            let mut state = before;
            for k in &keys {
                state[*k as usize] |= 0x80;
            }
            unsafe { SetKeyboardState(&state) }.map_err(|e| e.to_string())?;
        }
        Ok(Self { keys, before })
    }

    /// The MK_ bits a mouse message carries for these keys.
    fn mk(&self) -> usize {
        let mut mk = 0;
        if self.keys.contains(&0x10) {
            mk |= 0x0004;
        }
        if self.keys.contains(&0x11) {
            mk |= 0x0008;
        }
        mk
    }
}

impl Drop for Held {
    fn drop(&mut self) {
        if !self.keys.is_empty() {
            let _ = unsafe { windows::Win32::UI::Input::KeyboardAndMouse::SetKeyboardState(&self.before) };
        }
    }
}
