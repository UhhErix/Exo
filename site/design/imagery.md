# Product imagery: inventory and capture plan (not captured yet)

## What exists

| Where | What | Size | Notes |
| --- | --- | --- | --- |
| `exo-site/pictures/` (7 files: library, game, home, music, pc, store, devices) | Launcher rooms, the site's current pictures | 3840x2160 JPG | Site README says they come from `docs/media` in the Exo repo; the repo's copies are 1920x1080, so the 4K originals are not in any repo here. Their Bar still says "Home" (site README). |
| `ExoLauncher/docs/media/` (13 JPG + logo) | Launcher: library, game, gpu, gpu-display, upscalers, shaders, store, store-game, music, discord, settings, devices | 1920x1080 (shaders 1077x616) | Used by the Launcher README. Contains real game covers and a Discord room (blurred). |
| `ExoCinema/docs/media/` (4 JPG + logo) | Cinema: hero, home, first-run, whats-new | 1920x1080 | Film stills are Blender and Netflix test footage under CC licences, credited in the README. |
| `ExoBrowser/docs/media/` (8 JPG + logo) | Browser: hero, newtab, split, search, mods, vault, settings, first-run | 1920x1080 | Captured on a test profile. |
| `exo-site/public/cinema-assets/` | Cinema's looping clips (WebM and MP4), posters, and two films (Sol Levante, Wing It!) | 1280 to 3840 webp and avif | Test footage, credited on /legal/earlier-apps. |
| `ExoCinema-gpui/`, `ExoBrowser-gpui/` | Copies of the same docs/media | 1920x1080 | No new pictures. |

## What the rig can capture

- Displays: DISPLAY1 and DISPLAY2, both report 1920x1080 (`Win32_VideoController`: NVIDIA GeForce RTX 3070 at 1920x1080, 164 Hz; a Microsoft Remote Display Adapter is also listed). The second screen starts at X=1920, which is where test windows go.
- So **true 3840x2160 captures are not possible on this rig.** A 4K shot needs a 4K panel on this PC, or a virtual display driver at 3840x2160 (installing a driver is a system change, so it is the owner's call). Until then the best real source is 1920x1080 and the build's 3840 variant is an upscale. The site build (`build.mjs`) already accepts 1920x1080 sources.

## Capture method (no focus, no OS input)

- **Browser:** `ExoBrowser/tools/wincap.cpp` takes one frame of a window by its handle through Windows.Graphics.Capture. It reads the window's content even when another window covers it, so nothing is brought to the front. The test copy is started the way `tools/layout-check.mjs` does: its own `EXO_BROWSER_DATA` scratch folder and its own `EXO_BROWSER_CDP` port, on DISPLAY2 at X>=1920.
- **Launcher:** the test copy from `ExoLauncher/tools/stage-dev.ps1` (or `swap-dev.ps1`) with a scratch data folder, driven over DevTools by `tools/e2e/cdp.mjs`. `tools/e2e` restarts Exo with a loopback-only CDP port and puts it back. The owner's installed Exo is not attached to or restarted, and nothing is captured while a game or call is running.
- **Cinema:** a test copy with a scratch `%LocalAppData%\ExoCinema`, pointed at a test Jellyfin server. The player draws through libmpv into its own window, so the shot is taken with wincap on that window's handle, not a DevTools screenshot.
- In each case the window is sized to 1920x1080 at 100% scale on DISPLAY2 and captured without moving the owner's windows.

## Sample data rules

- No owner data: no real account, friend, email, chat, purchase, history, bookmark, saved password, or file name from the owner's PC.
- Launcher's Friends and Discord rooms need a test Discord account and a test server. Making one is an account action, so it is for the owner to decide and create (decision 2 below).
- Store and game covers: the existing site already shows the owner's real covers. For new shots, use a scratch library that holds only games the owner is happy to show. No faces; no photos of people.
- Browser: test pages on 127.0.0.1 and a test profile with invented logins. The vault shot uses made-up entries only.
- Cinema: the CC test films already in `public/cinema-assets`. The server and user names in shots are invented.

## Shot list (hero + four features per product)

Each shot: 1920x1080 PNG from the test copy, 100% scale, no cursor, no notifications. Alt text per shot.

**Exo Launcher**
1. Hero: the Library, with Continue and Friends are playing (names from the test account).
2. Game page: Play, time played, last launched, size, achievements, upscalers, shaders.
3. PC room: This PC with Best settings, drivers, network, drives.
4. Upscalers: every installed game's DLSS, FSR and XeSS on the newest release.
5. Discord room: the test server, DMs and a voice call (test account; owner's decision).

**Exo Cinema**
1. Hero: Home, Continue Watching and the library rows, over a film's backdrop.
2. Player: a film playing with Liquid Glass controls and the seek preview.
3. Show page: seasons and episodes of a test show, Up Next.
4. Keys and tracks: the audio and subtitles menu over a playing film.
5. Settings › Jellyfin: connected to the test server, with the password never shown.

**Exo Browser**
1. Hero: the Bar, spaces, favorites, pinned tabs and a new tab page, over a test page.
2. Exo Shield: Settings › Privacy with the blocked-count beside the address on a test page.
3. Exo Vault: the sheet with invented logins, cards and notes.
4. Split view: two test pages side by side.
5. Search: one field with suggestions from the test profile's history.

Current pictures stay in place until the new ones pass review (the owner's call).

## Decisions for the owner

1. Real 4K: attach a 4K display or approve a virtual display driver. Without one the new shots are 1920x1080.
2. Discord test account and test server for the Discord room. Creating an account is for the owner to do.
3. Approve running a test copy of each app (a dev build, scratch data folder, loopback CDP) on DISPLAY2 for capture.
4. Cinema's test Jellyfin server: install a local one (needs approval), or reuse the CC footage with a scratch library.
