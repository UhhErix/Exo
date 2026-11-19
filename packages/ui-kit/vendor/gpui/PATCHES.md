# Changes to the vendored gpui 0.2.2

`vendor/gpui` is gpui 0.2.2 from crates.io with `examples/`, `tests/` and `docs/` removed (the first commit is it unmodified). Every change after that is listed here, small enough to port to a newer gpui. Windows only: the other backends' renderers do not handle the new primitive and are not built.

## Windows: the vsync thread sleeps until a frame is wanted

Reused from the archived port (`archive/x-gpui-shell`, `exo-ui/vendor/gpui`), unchanged.

Plain gpui starts a `VSyncProvider` thread that loops `DwmFlush()` and `RedrawWindow`s every window once per vsync, for ever: 1 to 2 % of a core in a window that draws nothing, and 165 wake-ups a second of the UI thread. Patched:

- `platform/windows/vsync.rs`: `demand_frames()` (a window may need drawing: the thread runs for the next second) and `wait_for_demand()` (the thread sleeps on a condition variable, no timer, until then).
- `platform/windows/platform.rs`: the vsync loop calls `wait_for_demand()` before each `wait_for_vsync()`.
- `window.rs`: `Invalidator::set_dirty(true)` and `Window::on_next_frame` call `demand_frames()`.

## Backdrop blur (Liquid Glass)

gpui draws one forward pass and never reads back. Exo's glass needs what is behind it, blurred and toned, including the app's own content, so there is a primitive for it:

- `scene.rs`: `BackdropBlur`, a primitive kind and batch, ordered by its `reach` (its bounds grown by what the blur reads), so anything it can see draws first.
- `window.rs`: `Window::paint_backdrop_blur(bounds, corner_radii, sigma, brightness, contrast, saturation, tint)`, CSS's `backdrop-filter: blur() brightness() contrast() saturate()` under a fill.
- `platform/windows/directx_renderer.rs`: `draw_backdrop_blurs` copies the region out of the back buffer, steps it down to a quarter, runs a separable Gaussian there, and composites through a rounded-rect SDF. Its targets (full, half, two quarters: about 11 MB at 1080p) are made the first time a frame has glass and dropped on resize.
- `platform/windows/shaders.hlsl`, `build.rs`: the `backdrop_pass` and `backdrop_blur` shaders.

## Caption hit test asks where the cursor is now

`on_hit_test_window_control` answered from the last mouse move's hit test. Measured here: with the cursor moved off Close onto the page, `WM_NCHITTEST` kept answering `HTCLOSE`, so a press on the page could close the window. It now hit-tests the live cursor position.

## Windows: no stolen focus, no synthetic input

- `platform/windows/window.rs`, `WindowsWindow::new`: a window opened with `WindowOptions::focus: false` is placed with `SW_SHOWNOACTIVATE`, so it shows without taking the foreground. Plain gpui ignores `focus` on Windows and shows with the placement's `SW_SHOWNORMAL`, which activates. Test instances open this way.
- `platform/windows/window.rs`, `activate`: plain gpui sends a synthetic Alt press and release (`SendInput`) before `SetForegroundWindow`, to get around Windows' foreground lock. Removed: Exo sends no synthetic input (AGENTS.md's enforced rules; anti-cheat watches for it while a game runs), and when Windows refuses the foreground it flashes the taskbar button instead, which is the right answer for a launcher sitting beside a game.

## Windows: a hook before a window is first shown

- `platform.rs`: `on_window_created(fn(isize))`; `platform/windows/window.rs`: `WindowsWindow::new` calls it with the new `HWND` right after `CreateWindowExW`, before `SetWindowPlacement` shows it. AccessKit's `SubclassingAdapter` must be created before a window is first visible (it panics otherwise), and gpui shows a window inside `open_window`, before any app code sees it. `exo-inspect`'s `uia` uses it.

## Windows: `cx.notify()` asks for vsync ticks too

The vsync patch above wakes the thread from `Invalidator::set_dirty(true)`, but `WindowInvalidator::invalidate_view` (what `cx.notify()` reaches) marks the window dirty without it. Measured in the Discord spike (branch `spike/discord-gpui`, `native/spikes/discord-room`): a video tile notified 60 times a second drew for the first second only (the start-up demand's linger), then never again; anything notified from a task (a host message, a decoded frame) waited for an unrelated input or animation frame. `invalidate_view` now calls `demand_frames()` too. Found by the spike; the foundation's views notified from the host's pipe have the same bug without it.

## Windows: shared textures as surfaces (video)

gpui's `Surface` primitive is macOS-only (`paint_surface` with a `CVPixelBuffer`); on Windows `draw_surfaces` drew nothing. Video (Discord's cameras and Go Live) needs decoded frames on screen without a copy through the CPU per frame, so:

- `scene.rs`: `SharedTexture { id, handle }`, a BGRA8 `ID3D11Texture2D` another D3D11 device in the process shares by NT handle with a keyed mutex; `PaintSurface` carries it and corner radii on Windows.
- `window.rs`: `Window::paint_surface(bounds, corner_radii, SharedTexture)` on Windows.
- `platform/windows/directx_renderer.rs`: `draw_surfaces` opens each texture once (`OpenSharedResource1`, cached by `id`, let go after 120 frames unused or on device loss) and draws it through the polychrome sprite pipeline with the whole texture as its tile (that shader reads the texture's size off the bound view), under key 0 of its keyed mutex, taken with a 0 ms timeout: a texture its producer holds is skipped for that frame, so the UI thread never waits on a decoder.

The producer (a Media Foundation decoder and the D3D11 video processor, in the spike) must create the texture on the adapter gpui renders on.

## `DispatchEventResult` is public

`Window::dispatch_event` is public but returned a `pub(crate)` type, so nothing outside gpui could call it. The spike's in-app synthetic input (mouse through the window's own dispatch, no OS input) needs it.

## Windows: a page zoom over the screen's scale

DESIGN.md wants one layout on every screen: the shipping UI lays its page out as on a 1080p screen and draws it larger on a 1440p or 4K one (`MainWindow.PageScale.cs`, Chromium's device emulation). gpui's scale factor is the screen's DPI alone, so:

- `platform.rs`: `set_page_zoom(fn(f32, f32) -> f32)`, a rule from the window's screen (in its scaled pixels) to a zoom.
- `platform/windows/window.rs`: `zoomed_scale(hwnd, dpi)` is the DPI's scale times the rule's zoom; `WindowsWindow::new` places the window in the screen's own scaled pixels first, then takes the zoomed scale, so a window keeps the size it was asked for and its content is laid out smaller and drawn larger.
- `platform/windows/events.rs`: `WM_DPICHANGED` uses the zoomed scale; `WM_MOVE` asks the rule again (a screen of another size at the same DPI) and lays out again when it changed, skipping a move sent while the window's state is held.

Layout, text, input, hit tests and the caption all go through the scale factor, so they follow without other change.


## Windows: kerning stays on

`platform/windows/direct_write.rs` › `apply_font_features`: every layout run gets an `IDWriteTypography`, and a typography set on a layout replaces DirectWrite's default features, so text was shaped with no kerning at all (and with no ligatures when no feature was asked for: the function returned before adding them). Geist's `Accept` at 13 px drew 44.3 px against Chromium's 43.3, `Decline` 46.1 against 45.9, enough to move a row of buttons 3 px. Kerning (`kern`) is now added unless a font asks it off, and `liga`, `clig` and `calt` are added even with no features asked for. Found by the Gifts shelf's geometry check (`ui-test/fake-gifts.mjs`).

## Windows: one Direct3D device at start

`platform/windows/directx_devices.rs` › `get_adapter`: each adapter was checked by making a Direct3D 11 device and dropping it, then the chosen one made its device again. The device that passes the check is now the one kept. Measured from the host's launch with `tools/test-instance.ps1 -Perf` (5 runs each, RTX 3070): gpui's `Application::new` 355 to 380 ms before, 220 to 235 after; the first frame 699 to 752 ms before, 576 to 594 after.

## Windows: backdrop blur keeps the backdrop's alpha

`platform/windows/shaders.hlsl` › `backdrop_blur_fragment`: the composite sampled the blurred back buffer's `rgb` only and wrote it at full coverage, so glass over a transparent region of the back buffer drew an opaque slab. Measured in Exo Browser's port, which leaves the page's slot transparent for a WebView2 page in another DirectComposition target: the glass toolbar over it was near black (mean rgb 11, 11, 11) and hid the page. The back buffer is premultiplied (the swap chain's `DXGI_ALPHA_MODE_PREMULTIPLIED`, drawn with `SRC_ALPHA`, `INV_SRC_ALPHA`), so the shader now divides the sample by its alpha before the tone filters and returns coverage times that alpha. Glass over opaque content draws exactly as before; over a transparent region it stays transparent, tint included.

## Text is measured to 1/64 px

`elements/text.rs` › the measure function: a text's width was `ceil`ed to a whole pixel, so every label was up to a pixel wider than the same words in Chromium, whose layout keeps 1/64 px (`LayoutUnit`). Geist's `Help` at 13 px is 28.1 px in Blink and measured 29 here; a row of buttons or tabs drifted by the sum (Exo Cinema's Home tab 2.4 px, Settings › Help's third button 2.1 px, in `native/tools/parity`). The width is now rounded up to 1/64 px, which still never lets a box be narrower than its text (so nothing wraps or truncates for lack of a fraction). Layout still snaps boxes to whole pixels (taffy's rounding), as Chromium snaps what it paints.
