# getexo.app information architecture (phase 1)

## Current pages (live, measured 6 Nov 2026)

| Route | What is on it | Weak |
| --- | --- | --- |
| `/` | Launcher only: name, Download, SHA-256, seven room screenshots, one claim line | Reads as a Launcher page; no Cinema or Browser; no value line above the fold; Cinema and Browser unreachable from the first screen |
| `/cinema` | Cinema: a looping player demo, three story steps, a 33-item catalogue with filter, get panel, requirements | Strong interactive demo; too long to scan; "no tracking" claim (see copy.md flags) |
| `/launcher/changelog` | Full history of every Launcher release, one page | 344,000 px tall at 1440; no paging |
| `/cinema/changelog` | Full history | 39,500 px at 1440 |
| `/browser/changelog` | Full history; its only Download button goes home | The Browser product has no page at all |
| `/privacy` | Privacy statement for all three apps on one page | Overflows at 390 px (711 px); copies an old Launcher statement; names a telemetry host the Launcher repo doesn't |
| `/license` | Licence terms | Fine; add per-app summary |
| `/legal/earlier-apps` | Terms for the earlier apps, and Cinema's film credits | Linked as "Privacy", "License" and "Film credits" from Cinema's footer, so the links name a page they don't match |
| `/download/launcher`, `/download/cinema` | 302 to the installer on updates.getexo.app | Works |
| `/download/browser`, `/browser` | 302 to home | Browser can't be downloaded from the site. Browser 1.4.6 is live (`updates.getexo.app/v1/browser/latest`, installer 9.7 MB) |
| `/404` | Not-found page, status 404 | Fine |

Audit screenshots: `design/audit/` (1440 and 390 for each page above; long pages are cut at the first 12,000 px, and `report.json` has the full heights).

## Proposed sitemap

```
/                     Home
/launcher             Exo Launcher
/launcher/changelog   Changelog (newest 10, then older)
/cinema               Exo Cinema
/cinema/changelog     Changelog
/browser              Exo Browser (new)
/browser/changelog    Changelog
/download             Download: the three installers, SHA-256, versions from the feed
/download/<app>       302 to the installer (launcher, cinema, browser)
/privacy              Privacy: shared statement, then one section per app
/support              Help, bugs, security reports, Discord
/license              Licence: free for personal use, per app
/press                Press kit (phase 2)
/legal/earlier-apps   Earlier apps' terms and film credits (unchanged, linked from the footer)
/404
```

Not in the sitemap: Exo OS (not one of the three products), Stremio add-ons and Exo Watch (unreleased), Exo Store (not online).

## Navigation

- **Header (every page):** Exo mark (home) · Launcher · Cinema · Browser · Download · Changelog. On a phone the three product names stay visible; Download and Changelog move into the menu.
- **Footer:** Privacy · License · Support · Press · GitHub · Discord, then the affiliation line.
- The product pages link to each other in the footer ("Also from Exo"), as the README does. Launcher, Cinema and Browser are the same level; none is the home.

## Per page sections

**Home.** Hero: headline, subhead, three download buttons, one framed Library picture (the Launcher is the first product, so its picture leads). Then: three product cards (one line each, "See …"). Then "How Exo works" (four short statements). Then the privacy line. No testimonials, counts or badges.

**Launcher.** Hero: headline, subhead, Download, Changelog, SHA-256 link, one picture (Library). Sections in order: One library · Discord · Music · Captures · PC (drivers and upscalers, Shaders) · Devices (Exo Mouse, controllers, headphones) · Store (Steam prices, optional, behind the PC section) · Before you install (requirements, SmartScreen note) · Risks callout.

**Cinema.** Hero: headline, subhead, Download, the looping player clip (the current demo works and stays). Sections: Home and library · Player · Upscaling · Keys · Your password. Then the requirements panel: Windows 11 64-bit, WebView2, a Jellyfin server.

**Browser.** Hero: headline, subhead, Download, one picture (tabs, spaces, new tab). Sections: Exo Shield · Exo Vault · Tabs · Search · Look · Before you install.

**Download.** Three cards (name, version from the feed, size, Download, SHA-256, changelog link). One note on SmartScreen. The product pages each link here.

**Changelog (each app).** Headline and subhead, Download button, the newest ten releases, then "Show older releases", which loads the rest.

**Privacy.** The shared statement first. Then one section per app: what leaves the PC, what stays on it, the default for usage data and crash reports (decision 1). The Cloudflare Web Analytics note stays.

**Support.** Four actions: Read the help, Report a bug, Report a security problem (private advisory), Join the Discord.

**License.** Plain summary first ("free for personal use"), then the table per app, the open-source parts, and a link to each app's full LICENSE.

**Press (phase 2).** The family line and paragraph, the three product descriptions, logos and pictures that have been cleared for press.

## Technical changes the IA needs

- `src/worker.js:10` (DOWNLOAD) and `src/worker.js:11` (API): add `browser` to both routes. `public/_redirects:9` (`/download/browser / 302`) and `:10` (`/browser`) go; add `/browser` as a page. Browser's installer exists on the update address.
- `public/index.html` becomes the family home; the current Launcher page moves to `/launcher`. Keep `/` 301 redirects only where a page moves.
- Changelog pages: render the newest ten at build time, load the rest on request. The Worker already reads the feed; the build reads the same address.
- Version numbers in copy come from `/api/<app>.json`. The static fallbacks (`public/cinema.html:52`) are removed or corrected.

## Phase 2 (not in this round)

Press kit, per-app help pages, an Exo family page for accessibility statements, and any translations (none planned).
