# getexo.app copy deck (phase 1 draft)

Every claim here is checked against the apps' live update feeds (`updates.getexo.app/v1/<app>/changelog` and `/latest`, read 6 Nov 2026) and each repo's README, PRIVACY.md and code. Live versions: Launcher 3.24.3, Cinema 1.4.7, Browser 1.4.6. The local repo checkouts are older (Launcher VERSION 3.20.0, Cinema 1.4.4), so where they disagree the live feed wins. Nothing unreleased is promised: no Stremio add-ons or Exo Watch (Cinema's `Unreleased` section), no Exo account sign-in, no Exo Store, no GPUI ports.

Voice: plain, specific, confident. No "revolutionary", "blazing", "seamless", "powerful", "best-in-class", no fake numbers, no testimonials. Sentence case. Each product line says what the app does and what it needs.

Open owner decisions are marked **[DECISION]**. The copy below uses the neutral wording until they are settled.

## Decisions needed

1. **[DECISION] Privacy line.** The sources disagree. Launcher 3.24.3's live changelog says crash reports are on by default with no switch. Launcher 3.24.2 and the repo's `ExoLauncher/PRIVACY.md` say they are off until chosen. Cinema 1.4.6's live changelog says crash and freeze reports are on by default ("There is no switch"), while `ExoCinema/PRIVACY.md` says off. The site also loads Cloudflare Web Analytics (see Flags). Until you decide, the copy says only "No Exo account. No ads." and points to the Privacy page. The phrases "no analytics" and "no telemetry" must not appear.
2. **[DECISION] Launcher room name.** The site calls the room "Home"; the README and the 3.24.3 changelog call it "Discord". This copy uses "Discord".
3. **[DECISION] Typeface.** The brief, the site and Browser 1.4.5+ use Geist. `ExoLauncher/DESIGN.md:56` and `PRODUCT.md` still say Inter. This copy and the directions assume Geist.
4. **Cinema needs a Jellyfin server.** The live app (1.4.7) is Jellyfin-only. Stremio add-ons are unreleased and are not mentioned.

## Exo (the family)

- **Line:** Exo is three Windows 11 apps for games, films and the web, with no Exo account and no ads.
- **Paragraph:** Exo makes Exo Launcher for games, Discord and music, Exo Cinema for Jellyfin films and shows, and Exo Browser for private browsing. They share one look (Void black, Liquid Glass, Geist type, Tabler icons). Each installs for your Windows user, with no administrator rights, and updates from Exo's own address. None needs an Exo account, and none shows ads.

## Exo Launcher

- **Line:** Every game store, Discord, your music, your captures and your mouse in one Windows 11 app.
- **Paragraph:** Exo Launcher puts Steam, Epic, GOG, Amazon, Riot, Xbox, EA, Ubisoft, Battle.net and more in one library, plus any game you add. You install, update and play from one page, and the store apps run out of sight. It also has its own Discord client, a player for Spotify, Apple Music and YouTube Music, instant replay and recording, Exo Mouse settings, and a PC page for drivers and upscalers. Your library and settings stay on your PC, and there is no Exo account.

## Exo Cinema

- **Line:** Your Jellyfin library in Exo's look, with a native mpv player for HDR and Dolby Vision.
- **Paragraph:** Exo Cinema plays the films and shows on your Jellyfin server. Home, Movies, Shows and search are one window, with Continue Watching and Next Up from the server. The picture is drawn by libmpv with hardware decoding and HDR and Dolby Vision tone mapping, and the file plays as it is, never converted. It needs a Jellyfin server; it doesn't supply films.

## Exo Browser

- **Line:** A private browser for Windows 11, with ad blocking and a password vault on your PC.
- **Paragraph:** Exo Browser is built on Microsoft Edge WebView2, so pages and Chrome Web Store extensions work as they do in Edge. Exo Shield blocks ads and trackers on every site before they load, and stays on. Exo Vault keeps logins, cards, notes and identities encrypted on your PC, with no account and no cloud. Tabs can be grouped into spaces, favorites and folders, with split view and private tabs.

---

## Pages

### Home (`/`)
- **Title:** Exo: Launcher, Cinema and Browser for Windows 11
- **Headline:** Apps for your games, films and the web.
- **Subhead:** Three Windows 11 apps from one developer. No Exo account, no ads.
- **Buttons:** Download Launcher · Download Cinema · Download Browser
- **Section "Three apps":** the three one-liners, each with "See Launcher", "See Cinema", "See Browser".
- **Section "How Exo works":**
  - Each app is a native Windows 11 program with its own window.
  - Updates are offered, not forced: each app shows a new version and installs it when you say so.
  - Installs are for your Windows user only, with no administrator rights.
  - The installers aren't code-signed yet. Check the SHA-256 before you run one.
- **Privacy line:** No Exo account. No ads. What each app sends, and what it doesn't, is on the Privacy page.

### Launcher (`/launcher`)
- **Title:** Exo Launcher for Windows 11
- **Headline:** Every game store, in one library.
- **Subhead:** Steam, Epic, GOG, Riot, Xbox and more in one Windows 11 app, with Discord, your music and your captures beside them.
- **Buttons:** Download for Windows 11 · Read the changelog · Check the SHA-256
- **Section "One library for every store":** Steam, Epic, GOG, Amazon, Riot, Xbox, EA, Ubisoft, Battle.net, Rockstar, itch.io, Minecraft, Roblox, Paradox, Wargaming and any game you add. Play, install, update and uninstall from one page, with play time and size beside each game.
- **Section "Discord without the Discord app":** Exo's own Discord client, with servers, DMs, Friends and calls with camera and screen share. You sign in with a QR code from the Discord phone app. Discord's terms don't allow third-party clients, so this room is at your own risk.
- **Section "Spotify, Apple Music and YouTube Music in one player":** Browse your library, follow the lyrics, and control playback from the mini player in the top bar.
- **Section "Instant replay, recording and snips":** Captures are sorted by game. Exo Capture records on your graphics card's own encoder, from NVIDIA, AMD or Intel.
- **Section "Drivers and upscalers, checked first":** The newest NVIDIA driver, installed driver only, with no NVIDIA app. DLSS, FSR and XeSS are updated with the vendors' own signed files, and Restore puts the originals back.
- **Section "Your mouse, controller and headphones":** Exo Mouse talks to supported mice over USB with no vendor app: DPI, polling rate, buttons, and profiles that switch with a game. Controllers open a Controller Lab.
- **Section "Before you install":** Windows 11, 64-bit. Installs for your Windows user only. The installer isn't code-signed yet, so SmartScreen may warn the first time: check the SHA-256, then choose More info, then Run anyway.
- **Callout "Two things can put an account at risk":** Discord's client (above), and changing upscaler files in a game with anti-cheat. Exo asks for each game before it changes anything, and never touches Riot games.

### Cinema (`/cinema`)
- **Title:** Exo Cinema for Windows 11
- **Headline:** Your Jellyfin library, in its own window.
- **Subhead:** Exo Cinema plays your Jellyfin library with a native mpv player for HDR and Dolby Vision. It needs a Jellyfin server.
- **Buttons:** Download for Windows 11 · Read the changelog
- **Section "Home, Movies, Shows and search":** Continue Watching and Next Up come from your server, so other Jellyfin apps stay in step. Shows open season by season.
- **Section "A native player":** Hardware decoding, HDR and Dolby Vision tone mapping for your screen, and the video's own frame rate. The file plays as it is.
- **Section "A sharper picture":** Anime is redrawn with ArtCNN. A film smaller than your screen can be enlarged with NVIDIA RTX Video Super Resolution, when it is on in Exo Launcher's PC settings.
- **Section "Keys you already know":** Space or K to pause, arrows to seek, J and L for ten seconds, F for full screen, M to mute. Skip intro and Up Next for episodes.
- **Section "Your password stays out of Exo":** Your server's address, username and password are used to connect. The password is never kept. The server's token is sealed with Windows' data protection and stays on this PC.

### Browser (`/browser`)
- **Title:** Exo Browser for Windows 11
- **Headline:** A private browser for Windows 11.
- **Subhead:** Exo Browser blocks ads and trackers on every site before they load, and keeps your logins in a vault on your PC. Pages and Chrome Web Store extensions work as they do in Edge.
- **Buttons:** Download for Windows 11 · Read the changelog
- **Section "Ads and trackers, blocked before they load":** On every site, always on. Cookie notices, pop-ups and tracking parts of links are removed too. Its lists ship with the browser, so it fetches nothing to block.
- **Section "Logins, cards and notes on your PC":** Encrypted with AES-256-GCM. The key comes from your master password through Argon2id, and can also open with Windows Hello. No account and no cloud. Nobody can reset your master password, Exo included.
- **Section "Tabs in order":** Spaces, favorites, pinned tabs in folders, live folders that follow a site's newest posts, split view of up to four tabs, and private tabs that keep nothing.
- **Section "One field for everything":** An address opens; anything else goes to Brave Search, or to the engine you pick. Suggestions come from your tabs, bookmarks and history on this PC.
- **Section "Light, Dark or Void":** Void is pure black, for OLED screens. Liquid Glass or solid, an accent colour, tab size and reduced motion. Mods and Boosts are labs, off until you turn them on in Settings.
- **Section "Before you install":** Windows 11, 64-bit, with WebView2 (built into Windows 11). Installs for your Windows user only. Updates come only from Exo's own address.

### Download (`/download`)
- **Headline:** Download Exo
- **Subhead:** Each app is a 64-bit Windows 11 installer. Check its SHA-256 before you run it.
- **Cards:** Exo Launcher 3.24.3 · Exo Cinema 1.4.7 · Exo Browser 1.4.6. Each: Download, the SHA-256 (filled from the update address), "Read the changelog". The version numbers come from the live feed, not typed.
- **Note:** The installers aren't code-signed yet. Windows SmartScreen may warn: choose More info, then Run anyway, after checking the hash.

### Changelog (`/launcher/changelog`, `/cinema/changelog`, `/browser/changelog`)
- **Headline:** Exo Launcher changelog (and the same for each app)
- **Subhead:** Every release, newest first, read from Exo's update address.
- **Button:** Download for Windows 11
- **Paging:** the newest 10 releases, then "Show older releases" (the Launcher page is 344,000 px tall today; see Flags).

### Privacy (`/privacy`)
- **Headline:** Privacy
- **Subhead:** What each app sends, what stays on your PC, and what Exo doesn't collect.
- **Shared text:** No Exo account. No ads. Your library, settings, history, bookmarks and vault stay on your PC. This site counts visits with Cloudflare Web Analytics, without cookies.
- **Per app:** "What leaves your PC" (updates; store lookups, covers and driver releases for Launcher; your server and add-on requests for Cinema; the sites you open, address lookups to Cloudflare, and searches for Browser) and "What stays on this PC". **[DECISION]** State the default for usage data and crash reports in each app, as the app ships it.

### Support (`/support`)
- **Headline:** Help and support
- **Subhead:** Ask a question, report a bug, or report a security problem.
- **Buttons:** Read the help · Report a bug · Report a security problem · Join the Discord
- **Note:** Logs stay on your PC. Check a log before you share it.

### License (`/license`)
- **Headline:** License
- **Subhead:** Exo is free for personal use. Its source is not published, except for the open-source parts it ships: Exo Mouse (AGPL-3.0) and Exo Shaders (GPL-3.0).

### Press (`/press`, phase 2)
- **Headline:** Press
- **Subhead:** Exo's three Windows 11 apps, with the one-line and paragraph descriptions above, logos and screenshots.

### 404
- **Headline:** Page not found.
- **Subhead:** This address isn't one of Exo's pages. Go to the home page or to Download.

---

## Flags: current site claims that are wrong or outdated

- `public/index.html:72`: "No account, no ads, no analytics, no telemetry." Wrong on two counts. The site loads Cloudflare Web Analytics (`src/headers.js` allows its beacon; `public/privacy.html:57` says so). Launcher 3.24.3 sends crash reports by default. Replace with the neutral line until decision 1.
- `public/cinema.html:7` and `:23` (meta and og description): "No account, no ads, no tracking." Same problem as above: the site counts visits, and Cinema 1.4.6 sends crash and freeze reports by default.
- `public/privacy.html:68`: the Launcher privacy text says "no analytics and no telemetry" and "no … crash-reporting service". Out of date against 3.24.3 and the repo's PRIVACY.md.
- `public/privacy.html:45`: names `telemetry.getexo.app`. The Launcher PRIVACY.md names `reports.getexo.app`. One of them is wrong; check the Worker before publishing.
- `public/index.html:48`: the Launcher room is called "Home". The app's README and 3.24.3 changelog call it "Discord" (decision 2). The picture alt text at `public/index.html:49` says "The Home room" too.
- `public/cinema.html:52`: the fallback says "Version 1.4.3"; the live version is 1.4.7. It is replaced by the script, but the fallback should be correct or removed.
- `public/browser/changelog.html:31`, `public/launcher/changelog.html:31`: the Download button on the Browser page goes to `/download/browser`, which `public/_redirects:9` sends home. The Browser page has a download button that doesn't download. The Worker's DOWNLOAD route (`src/worker.js:10`) only accepts launcher and cinema.
- `public/privacy.html` at 390 px: the page is 711 px wide in a 390 px viewport (horizontal scroll; `design/audit/report.json`).
- `public/launcher/changelog.html`: renders the whole history on one page, 344,000 px tall at 1440 px.
- `public/index.html:31-32`: the first screen has the name, a button and a 40-character hash, but no line about what the app does. The one-line description is in the meta tag only.
- No Browser page exists. `/browser` is a 302 to home (`public/_redirects:10`).
- `ExoLauncher/README.md` and `PRODUCT.md` still say Inter and version 3.20. Those are repo documents, not the site, but they feed the copy.
