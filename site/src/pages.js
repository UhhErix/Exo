import { readFileSync } from 'node:fs'
import { RELEASES } from './releases.js'

const LEGAL_DIR = new URL('./legal/', import.meta.url)

const ICON_DEFS = `<svg width="0" height="0" hidden aria-hidden="true">
<symbol id="i-download" viewBox="0 0 24 24"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5l5-5m-5-7v12"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6 6l6-6m-6-6l6 6"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M10 10h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 9c-4.5-.5-8-4-8-9V7l8-4"/></symbol>
<symbol id="i-sparkles" viewBox="0 0 24 24"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3M5 17l.9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9L5 17M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14"/></symbol>
<symbol id="i-layers" viewBox="0 0 24 24"><path d="M12 4l8 4l-8 4l-8-4l8-4M4 12l8 4l8-4M4 16l8 4l8-4"/></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.3 3.9L2.5 17.4A2 2 0 0 0 4.2 20.4h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></symbol>
</svg>`

const picture = (slot, alt, sizes, priority = false) =>
  `<img src="/assets/${slot}-0.0.avif" srcset="" sizes="${sizes}" width="1920" height="1080" ${priority ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'} alt="${alt}">`

const formatSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB · ${bytes.toLocaleString('en-US')} bytes`

const shaStrip = (app, { compact = false } = {}) => {
  const r = RELEASES[app]
  return `<div class="release-strip" data-release="${app}">
<div class="release-meta"><span data-release-version="${app}" data-prefix="Version ">Version ${r.version}</span><span>·</span><span data-release-size="${app}">${formatSize(r.bytes)}</span><span>·</span><span>64-bit Windows 11</span></div>
<div class="release-sha-row"><code data-release-sha="${app}">${r.sha256}</code><button type="button" class="btn copy" data-copy-sha="${r.sha256}" data-copy-sha-for="${app}"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-copy"/></svg><span>${compact ? 'Copy' : 'Copy SHA-256'}</span></button></div>
</div>`
}

const head = ({ title, description, path, ogSlot = 'launcher', ogDescription = description, noindex = false, ldJson = null }) => {
  const canonical = `https://getexo.app${path}`
  const ogFile = ogSlot === 'cinema' ? '/assets/og-cinema.0.jpg' : '/assets/og-launcher.0.jpg'
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#000000">
<link rel="preload" href="/assets/exoline.0.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.0.css">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Exo">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${ogDescription}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://getexo.app${ogFile}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://getexo.app${ogFile}">
<script type="module" src="/assets/site.0.js"></script>
${ldJson ? `<script type="application/ld+json">${JSON.stringify(ldJson)}</script>\n` : ''}</head>`
}

const header = (current = '') => `<a class="skip" href="#main">Skip to content</a>
<header class="bar" data-bar>
<div class="bar-inner">
<a class="brand" href="/" aria-label="Exo home"><img class="mark" src="/favicon.svg" alt="" width="30" height="30"><span>Exo</span></a>
<nav aria-label="Main">
<div class="bar-menu-wrap" data-menu-wrap>
<button class="bar-menu" type="button" aria-expanded="false" aria-controls="bar-links"><span>Apps</span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6l6-6"/></svg></button>
<div class="bar-links" id="bar-links">
<a href="/launcher"${current === '/launcher' ? ' aria-current="page"' : ''}>Launcher</a><a href="/cinema"${current === '/cinema' ? ' aria-current="page"' : ''}>Cinema</a><a href="/launcher/changelog"${current === '/changelog' ? ' aria-current="page"' : ''}>Changelog</a><a href="/help"${current === '/help' ? ' aria-current="page"' : ''}>Help</a>
</div>
</div>
<a class="btn primary small bar-dl" href="/download"${current === '/download' ? ' aria-current="page"' : ''}><span>Download</span></a>
</nav>
</div>
</header>`

const footer = () => `<footer class="foot">
<div class="foot-top">
<a class="brand" href="/" aria-label="Exo home"><img class="mark" src="/favicon.svg" alt="" width="28" height="28"><span>Exo</span></a>
<p class="foot-promise">No ads. Your data is never sold.</p>
</div>
<nav aria-label="Footer"><a href="/launcher">Launcher</a><a href="/cinema">Cinema</a><a href="/download">Download</a><a href="/launcher/changelog">Launcher changelog</a><a href="/cinema/changelog">Cinema changelog</a><a href="/privacy">Privacy</a><a href="/license">License</a><a href="/source">Source</a><a href="/help">Help</a><a href="https://discord.gg/44mXWhaHP4">Discord</a></nav>
<p>© 2026 Erix. Exo isn't affiliated with or endorsed by Valve, Discord, Spotify, NVIDIA, Jellyfin, mpv, Microsoft or the other companies whose software it works with. Their names and marks belong to their owners.</p>
</footer>`

const ROOMS = [
  ['library', 'Library', 'All stores in one Void black grid', 'Steam, Epic, GOG, Riot, Xbox, EA, Ubisoft, Battle.net and added games together under Exo 3.28.0 with Real Liquid Glass top bar and Steam Family badges.'],
  ['game', 'Game page', 'Zero-scroll game sheet', 'Play, total playtime, last launched, storage footprint, live DLSS/FSR/XeSS versions, OptiScaler frame generation, HDR and Shader status on one page without scrolling.'],
  ['store', 'Store', 'Discover across official storefronts', 'Curated picks, upcoming calendar, wishlist price alerts and per-store pricing without ads or third-party grey markets.'],
  ['discord', 'Discord', 'Native Discord client inside Exo', 'Servers, DMs, Friends, Stage channels, HDR screen share and release announcements running natively beside your games.'],
  ['music', 'Music', 'Spotify, Apple Music and YouTube Music', 'Browse your library, follow lyrics and control volume or Jam directly from Exo\u2019s mini player without extra windows.'],
  ['pc', 'PC & Shaders', 'Hardware, drivers and Exo Shaders 1.4.8', 'Driver-only NVIDIA updates with Autopilot restore, precompiled shader caches and hardware status in plain words.'],
  ['apps', 'Apps', 'Redesigned PC > Apps uninstaller', 'Inspect every Windows app and startup entry with Exo replaces, Startup and Bloat tags alongside dependency counts.'],
  ['devices', 'Devices', 'Exo Mouse and audio gear over USB', 'Configure supported mice (DPI, polling rate, per-game profiles) and inspect connected audio gear without vendor bloatware.'],
]

export function homePage() {
  const l = RELEASES.launcher
  const c = RELEASES.cinema
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Exo',
    url: 'https://getexo.app/',
    logo: 'https://getexo.app/exo-512.png',
    sameAs: ['https://github.com/UhhErix/Exo', 'https://discord.gg/44mXWhaHP4'],
  }
  return `${head({
    title: 'Exo: Launcher and Cinema for Windows 11',
    description: 'Two Windows 11 apps from one developer: Exo Launcher 3.28.0 for games, Discord, music and hardware, and Exo Cinema for your Jellyfin library. Pure OLED black. No ads. Your data is never sold.',
    path: '/',
    ogDescription: 'Two Windows 11 apps from one developer. No ads. Your data is never sold.',
    ldJson: ld,
  })}
<body>
${ICON_DEFS}
${header('/')}
<main id="main">
<section class="hero-home">
<span class="eyebrow hero-anim">Exo for Windows 11 <span class="ver-badge" data-release-version="launcher" data-prefix="v">v${l.version}</span></span>
<h1 class="display hero-anim d1">Apps for your games and films.</h1>
<p class="lead hero-anim d2">Exo Launcher brings every game store, Discord, music, shaders, captures and devices into pure Void black. Exo Cinema plays your Jellyfin library through native mpv.</p>
<div class="row hero-anim d3">
<a class="btn primary" href="/download/launcher" rel="nofollow"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-download"/></svg>Download Launcher</a>
<a class="btn" href="/launcher">Explore Launcher</a>
<a class="btn" href="/cinema">Exo Cinema</a>
</div>
<p class="hero-meta hero-anim d4"><span data-release-version="launcher" data-prefix="Launcher ">Launcher ${l.version}</span> · <span data-release-version="cinema" data-prefix="Cinema ">Cinema ${c.version}</span> · 64-bit Windows 11 · No ads</p>
<div class="frame hero-anim d4">${picture('library', 'Exo Launcher 3.28.0 game library on pure black with Real Liquid Glass top bar', '(min-width: 1240px) 1104px, 100vw', true)}</div>
</section>

<section class="wrap" data-reveal aria-labelledby="apps-title" data-tabs="apps">
<div class="sec-head">
<div>
<h2 class="section" id="apps-title">Two focused apps.</h2>
<p class="sec-sub">Built to match Exo\u2019s typography, pure black discipline and zero-bloat speed.</p>
</div>
<div class="seg-bar" role="tablist" aria-label="Choose an Exo app">
<span class="seg-pill" data-tab-pill aria-hidden="true"></span>
<button type="button" role="tab" class="seg-btn" id="app-tab-launcher" aria-controls="app-panel-launcher" aria-selected="true" tabindex="0">Exo Launcher</button>
<button type="button" role="tab" class="seg-btn" id="app-tab-cinema" aria-controls="app-panel-cinema" aria-selected="false" tabindex="-1">Exo Cinema</button>
</div>
</div>
<div role="tabpanel" class="tab-panel app-split" id="app-panel-launcher" aria-labelledby="app-tab-launcher">
<div>
<div class="app-tag"><img class="app-icon" src="/brand/discord/exo-launcher-avatar.png" alt="" width="28" height="28"><span>Exo Launcher</span><span class="ver-badge" data-release-version="launcher" data-prefix="v">v${l.version}</span></div>
<h3>Every game store, in one library.</h3>
<p class="lead">One fast library across Steam, Epic, GOG, Riot, Xbox and more — plus native Discord, Music, PC driver/app cleanup, Exo Shaders, Capture and Exo Mouse.</p>
<ul class="app-bullets">
<li>Real Liquid Glass capsules over pure OLED black surfaces and zero-scroll game pages</li>
<li>Redesigned PC &gt; Apps uninstaller and automatic Exo EQ audio profiles</li>
<li>Discord HDR screen sharing, Stage channels, Steam Family badges and Exo Shaders 1.4.8</li>
</ul>
<div class="row"><a class="btn primary" href="/download/launcher" rel="nofollow"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-download"/></svg>Download</a><a class="btn" href="/launcher">See Launcher</a><a class="btn" href="/launcher/changelog">Changelog</a></div>
</div>
<div class="frame">${picture('game', 'Exo Launcher 3.28.0 zero-scroll game sheet for Beast of Reincarnation', '(min-width: 900px) 680px, 100vw', false)}</div>
</div>
<div role="tabpanel" class="tab-panel app-split" id="app-panel-cinema" aria-labelledby="app-tab-cinema" hidden>
<div>
<div class="app-tag"><img class="app-icon" src="/brand/discord/exo-cinema-avatar.png" alt="" width="28" height="28"><span>Exo Cinema</span><span class="ver-badge" data-release-version="cinema" data-prefix="v">v${c.version}</span></div>
<h3>Your Jellyfin library, in its own window.</h3>
<p class="lead">Connect directly to your Jellyfin server for Continue Watching, Next Up, Movies and Shows with a native libmpv player built for HDR and Dolby Vision.</p>
<ul class="app-bullets">
<li>Direct Jellyfin connection with hardware decoding, Dolby Vision tone mapping and native refresh rates</li>
<li>ArtCNN anime sharpening and RTX Video Super Resolution that step aside during games</li>
<li>Compact delta updates served directly from Exo\u2019s update service</li>
</ul>
<div class="row"><a class="btn primary" href="/download/cinema" rel="nofollow"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-download"/></svg>Download</a><a class="btn" href="/cinema">See Cinema</a><a class="btn" href="/cinema/changelog">Changelog</a></div>
</div>
<div class="frame">${picture('cinema-hero', 'Exo Cinema Home showing Sintel (Blender Foundation, CC BY 3.0)', '(min-width: 900px) 680px, 100vw', false)}</div>
</div>
</section>

<section class="wrap" data-reveal aria-labelledby="tour-heading" data-tabs="home-rooms">
<div class="sec-head">
<div>
<span class="kicker">What\u2019s in 3.28.0</span>
<h2 class="section" id="tour-heading">Inspect every room.</h2>
<p class="sec-sub">Real Liquid Glass controls, zero-scroll game pages, native Discord calls, lossless Apple Music or Spotify control, clean uninstaller and USB device tuning.</p>
</div>
<div class="seg-bar" role="tablist" aria-label="Exo Launcher rooms"><span class="seg-pill" data-tab-pill aria-hidden="true"></span>${ROOMS.map(([id, label], i) =>
    `<button type="button" role="tab" class="seg-btn" id="home-rtab-${id}" aria-controls="home-rpanel-${id}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}">${label}</button>`
  ).join('')}</div>
</div>
${ROOMS.map(([id, , title, desc], i) =>
    `<div role="tabpanel" class="tab-panel stage-card" id="home-rpanel-${id}" aria-labelledby="home-rtab-${id}"${i === 0 ? '' : ' hidden'}>
<div class="stage-caption"><h3>${title}</h3><p>${desc}</p></div>
<div class="frame">${picture(id, `Exo Launcher 3.28.0 — ${title}`, '(min-width: 1240px) 1104px, 100vw', false)}</div>
</div>`
  ).join('\n')}
</section>

<section class="wrap" data-reveal aria-labelledby="pillars-title">
<h2 class="section" id="pillars-title">Designed without compromises.</h2>
<div class="grid-3">
<article class="tile-card">
<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sparkles"/></svg>
<h3>Real Liquid Glass</h3>
<p>Top navigation capsules, sheets, Ctrl+K command palette, game pages and music controls render true backdrop-blur glass over pure OLED black rooms.</p>
</article>
<article class="tile-card">
<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-layers"/></svg>
<h3>Every system tool tuned</h3>
<p>Driver-only NVIDIA installs, disk-verified anti-cheat protection, OptiScaler frame generation, Exo Shaders 1.4.8, automatic Exo EQ and PC &gt; Apps cleanup.</p>
</article>
<article class="tile-card">
<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-shield"/></svg>
<h3>Private by default</h3>
<p>No ads, no data brokers, signed-user backups and verified installers with full SHA-256 hashes published before every run.</p>
</article>
</div>
</section>

<section class="wrap" data-reveal aria-label="Download Exo">
<div class="cta-band">
<div>
<h2>Ready for Windows 11.</h2>
<p>Grab verified 64-bit installers for Exo Launcher and Exo Cinema, inspect SHA-256 checksums or check release notes.</p>
</div>
<div class="row">
<a class="btn primary" href="/download">Go to downloads</a>
<a class="btn" href="/help">Help &amp; FAQ</a>
</div>
</div>
</section>
</main>
${footer()}
</body>
</html>`
}

export function launcherPage() {
  const l = RELEASES.launcher
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Exo Launcher',
    operatingSystem: 'Windows 11',
    applicationCategory: 'GameApplication',
    softwareVersion: l.version,
    downloadUrl: 'https://getexo.app/download/launcher',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
  const features = [
    ['game', 'Library & Game sheets', 'Zero-scroll game pages across every storefront.', 'Steam (with QR sign-in and Family badges), Epic, GOG, Amazon, Riot, Xbox, EA, Ubisoft, Battle.net, Rockstar, itch.io, Minecraft and custom titles. Stats, DLSS/FSR/XeSS versions, OptiScaler frame generation, HDR and Shaders sit inline on a single zero-scroll sheet.', false],
    ['apps', 'PC > Apps & Audio', 'Clean bloatware and keep Exo EQ locked in.', 'The redesigned PC > Apps uninstaller groups Startup, Exo replaces and Bloat tags alongside dependency counts. Automatic Exo EQ switches per-game sound curves cleanly alongside Windows Output and Microphone controls.', true],
    ['discord', 'Discord', 'Native Discord with screen share and Stage channels.', 'Servers, DMs, Friends, HDR-tonemapped screen sharing with H.265/H.264 fallback, Stage channels, soundboard search and gift embeds right beside your games.', false],
    ['music', 'Music', 'Spotify, Apple Music and YouTube Music built in.', 'Browse your library, follow synced lyrics and steer playback and volume from Exo\u2019s mini player in the top bar without opening separate browser windows.', true],
    ['pc', 'Drivers & Shaders', 'NVIDIA driver-only installs and Exo Shaders 1.4.8.', 'Clean driver updates without vendor bloat, Autopilot optimization that preserves your overrides, always-on Memory Integrity checks, and precompiled shaders across games.', false],
    ['store', 'Store', 'Official store prices and wishlist alerts.', 'Discover new, upcoming and discounted releases across official storefronts only, with wishlist alerts when games drop in price on Steam.', true],
    ['devices', 'Devices', 'Exo Mouse and audio peripherals over USB.', 'Tune DPI stages, polling rate, buttons and per-game mouse profiles natively over USB without background vendor suites.', false],
  ]
  return `${head({
    title: 'Exo Launcher for Windows 11: every game store in one library',
    description: 'Exo Launcher 3.28.0 puts every game store, native Discord, music, Exo Shaders, PC cleanup and Exo Mouse on pure black with Real Liquid Glass.',
    path: '/launcher',
    ogSlot: 'launcher',
    ldJson: ld,
  })}
<body>
${ICON_DEFS}
${header('/launcher')}
<main id="main">
<section class="split-hero">
<div>
<div class="app-tag hero-anim"><img class="app-icon" src="/brand/discord/exo-launcher-avatar.png" alt="" width="28" height="28"><span>Exo Launcher</span><span class="ver-badge" data-release-version="launcher" data-prefix="v">v${l.version}</span></div>
<h1 class="display hero-anim d1">Every game store, in one library.</h1>
<p class="lead hero-anim d2">Steam, Epic, GOG, Riot, Xbox and more in one Windows 11 app, with Real Liquid Glass over pure black rooms, native Discord, music, captures and devices.</p>
<div class="row hero-anim d3">
<a class="btn primary" href="/download/launcher" rel="nofollow"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-download"/></svg>Download for Windows 11</a>
<a class="btn" href="/launcher/changelog">Read the changelog</a>
</div>
<div class="hero-anim d4">${shaStrip('launcher')}</div>
</div>
<div class="frame hero-anim d3">${picture('library', 'Exo Launcher 3.28.0 Library grid and Real Liquid Glass bar', '(min-width: 900px) 700px, 100vw', true)}</div>
</section>

<section class="features" aria-label="What Exo Launcher 3.28.0 includes">
${features.map(([slot, kicker, title, desc, flip]) =>
    `<div class="feature${flip ? ' flip' : ''}" data-reveal>
<div>
<span class="kicker">${kicker}</span>
<h2 class="section">${title}</h2>
<p class="lead">${desc}</p>
</div>
<div class="frame">${picture(slot, `Exo Launcher 3.28.0 — ${kicker}`, '(min-width: 900px) 700px, 100vw', false)}</div>
</div>`
  ).join('\n')}
</section>

<section class="facts" data-reveal aria-label="Before you install">
<h2 class="section">Before you install.</h2>
<dl>
<div><dt>Requirements</dt><dd>Windows 11 only, 64-bit. Setup stops on older Windows. Installs for your Windows user only, with no administrator rights.</dd></div>
<div><dt>The installer</dt><dd>It isn\u2019t code-signed yet, so SmartScreen may warn the first time: verify the SHA-256 above, then choose More info and Run anyway.</dd></div>
<div><dt>Captures</dt><dd>In-repo native Exo Capture records instant replay, clips and snips with your GPU hardware encoder (NVIDIA, AMD or Intel) plus Liquid Glass FPS readout.</dd></div>
<div><dt>Exo account</dt><dd>Setup asks you to create an Exo account or sign in after Welcome so preferences, collections and play time sync across your Windows 11 PCs. Paths, GPU/display and Discord settings stay on this PC.</dd></div>
<div><dt>Backups</dt><dd>Automatic daily backups to <code>Documents\\Exo\\Backups\\Launcher</code> keeping 30 days. Reinstalls offer one-click Restore on first run.</dd></div>
<div><dt>Updates &amp; Safety</dt><dd>Updates and store tools come only from <code>updates.getexo.app</code> with SHA-256 verification. Pending updates wait until no game is running.</dd></div>
</dl>
<div class="callout"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-alert"/></svg><span>Changing upscaler files in a game with anti-cheat can risk that game account. Exo detects anti-cheat from disk, asks per game and never touches Riot games. <a href="/privacy">Privacy details</a>.</span></div>
</section>
</main>
${footer()}
</body>
</html>`
}

export function cinemaPage() {
  const c = RELEASES.cinema
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Exo Cinema',
    operatingSystem: 'Windows 11',
    applicationCategory: 'MultimediaApplication',
    softwareVersion: c.version,
    downloadUrl: 'https://getexo.app/download/cinema',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
  return `${head({
    title: 'Exo Cinema for Windows 11: your Jellyfin library',
    description: 'Exo Cinema plays your Jellyfin library on Windows 11 with a native libmpv player for HDR and Dolby Vision. No ads. Your data is never sold.',
    path: '/cinema',
    ogSlot: 'cinema',
    ogDescription: 'Your Jellyfin library in Exo\u2019s look, with a native libmpv player for HDR and Dolby Vision.',
    ldJson: ld,
  })}
<body>
${ICON_DEFS}
${header('/cinema')}
<main id="main">
<section class="split-hero">
<div>
<div class="app-tag hero-anim"><img class="app-icon" src="/brand/discord/exo-cinema-avatar.png" alt="" width="28" height="28"><span>Exo Cinema</span><span class="ver-badge" data-release-version="cinema" data-prefix="v">v${c.version}</span></div>
<h1 class="display hero-anim d1">Your Jellyfin library, in its own window.</h1>
<p class="lead hero-anim d2">Exo Cinema plays directly from your Jellyfin server with a native libmpv player tuned for HDR, Dolby Vision and refresh-rate matching.</p>
<div class="row hero-anim d3">
<a class="btn primary" href="/download/cinema" rel="nofollow"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-download"/></svg>Download for Windows 11</a>
<a class="btn" href="/cinema/changelog">Read the changelog</a>
</div>
<div class="hero-anim d4">${shaStrip('cinema')}</div>
</div>
<div class="frame hero-anim d3">${picture('cinema-hero', 'Exo Cinema Home showing Sintel (Blender Foundation, CC BY 3.0) above Continue Watching', '(min-width: 900px) 700px, 100vw', true)}</div>
</section>

<section class="features" aria-label="What Exo Cinema does">
<div class="feature" data-reveal>
<div>
<span class="kicker">Jellyfin first</span>
<h2 class="section">Start with your server.</h2>
<p class="lead">Sign in directly to your own Jellyfin server. Continue Watching, Next Up, Movies, Shows, search and audio/subtitle picks stay in sync with every Jellyfin app.</p>
</div>
<div class="frame">${picture('cinema-home', 'Exo Cinema welcome screen with Get started', '(min-width: 900px) 700px, 100vw', false)}</div>
</div>
</section>

<section class="facts" data-reveal aria-label="How Exo Cinema plays">
<h2 class="section">How it plays.</h2>
<dl>
<div><dt>Direct Jellyfin playback</dt><dd>Home, Movies, Shows, Continue Watching and Next Up come strictly from your Jellyfin server. Files play direct without transcoding loss.</dd></div>
<div><dt>Native libmpv engine</dt><dd>Hardware decoding, HDR and Dolby Vision tone mapping for your monitor, and automatic frame-rate matching.</dd></div>
<div><dt>Sharper pictures</dt><dd>On AC power with a dedicated GPU, ArtCNN sharpens anime and NVIDIA RTX Video Super Resolution upscales SD/HD video, pausing whenever a game runs.</dd></div>
<div><dt>Keyboard shortcuts</dt><dd>Space or K pauses, Left/Right seek, J/L jump 10 seconds, F toggles fullscreen and M mutes, plus Skip Intro and Up Next.</dd></div>
<div><dt>Sealed credentials</dt><dd>Server credentials are sealed with Windows DPAPI per Windows user and never leave your machine to third parties.</dd></div>
<div><dt>Privacy &amp; updates</dt><dd>Nothing you watch is ever sent to Exo. Delta updates download only changed files from <code>updates.getexo.app</code> after SHA-256 verification. <a href="/privacy">Privacy page</a>.</dd></div>
</dl>
<div class="callout"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-layers"/></svg><span>Frames shown from Sintel and Tears of Steel, © Blender Foundation, CC BY 3.0 (blender.org). <a href="/legal/earlier-apps#film-credits">Full film credits</a>.</span></div>
</section>
</main>
${footer()}
</body>
</html>`
}

export function downloadPage() {
  const row = (app, name, icon, desc) => `<article class="dl-row" data-release="${app}">
<div>
<div class="dl-head"><img src="${icon}" alt="" width="34" height="34"><h2>${name}</h2></div>
<p>${desc}</p>
${shaStrip(app)}
</div>
<div class="row">
<a class="btn primary" href="/download/${app}" rel="nofollow"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-download"/></svg>Download</a>
<a class="btn" href="/${app}/changelog">Changelog</a>
</div>
</article>`

  return `${head({
    title: 'Download Exo: Launcher and Cinema for Windows 11',
    description: 'Download Exo Launcher and Exo Cinema for 64-bit Windows 11. Verify each installer\u2019s SHA-256 checksum before running.',
    path: '/download',
    ogSlot: 'launcher',
    ogDescription: 'Each Exo app is a 64-bit Windows 11 installer. Check its SHA-256 before you run it.',
  })}
<body>
${ICON_DEFS}
${header('/download')}
<main id="main">
<section class="page-head">
<span class="eyebrow hero-anim">Windows 11 · x64</span>
<h1 class="display hero-anim d1">Download Exo.</h1>
<p class="lead hero-anim d2">Official 64-bit installers served through Exo\u2019s update mirror, with live SHA-256 verification.</p>
</section>
<section class="dl-grid" aria-label="Installers">
${row('launcher', 'Exo Launcher', '/brand/discord/exo-launcher-avatar.png', 'Every game store, Discord, Music, PC driver/app cleanup, Exo Shaders 1.4.8, Exo Capture and Exo Mouse in one Windows 11 app.')}
${row('cinema', 'Exo Cinema', '/brand/discord/exo-cinema-avatar.png', 'Your Jellyfin library in Exo\u2019s pure black look, powered by native libmpv for HDR and Dolby Vision.')}
<p class="sha-note">Because the installers aren\u2019t code-signed yet, Windows SmartScreen may show a warning on first run. Compare the SHA-256 above using PowerShell <code>Get-FileHash ExoLauncher-Setup.exe</code>, then select <b>More info</b> and <b>Run anyway</b>.</p>
</section>
</main>
${footer()}
</body>
</html>`
}

export function helpPage() {
  return `${head({
    title: 'Help · Exo',
    description: 'Short answers for Exo Launcher 3.28.0 and Exo Cinema, the Exo Discord server, and a direct message form.',
    path: '/help',
    ogDescription: 'Short answers for each Exo app, the Exo Discord, and a contact form.',
  })}
<body>
${ICON_DEFS}
${header('/help')}
<main id="main" class="doc">
<div class="doc-head">
<span class="kicker">Support</span>
<h1>Help</h1>
<p class="claim">Short answers for Exo Launcher and Exo Cinema, plus Discord and direct contact with Erix.</p>
</div>
<div class="cards apps">
<article class="card">
<h2>Launcher</h2>
<ul>
<li><b>Install.</b> Get Exo Launcher from the <a href="/download">download page</a>. Needs 64-bit Windows 11; installs per-user with no admin rights.</li>
<li><b>Updates.</b> Offered automatically on startup when idle from <code>updates.getexo.app</code> with SHA-256 verification; waits until running games exit.</li>
<li><b>Exo account &amp; recovery.</b> Syncs preferences and play time across PCs. Keep your recovery code somewhere safe — it is shown once.</li>
<li><b>Where data lives.</b> Library and settings in <code>%LocalAppData%\\ExoLauncher</code>, notes in <code>Documents\\Exo Notes</code>, backups in <code>Documents\\Exo\\Backups\\Launcher</code>, captures in Videos.</li>
<li><b>PC &gt; Apps &amp; Shaders.</b> Uninstall unwanted bloat cleanly, inspect startup tags, and manage precompiled shader caches in PC &gt; Shaders.</li>
</ul>
</article>
<article class="card">
<h2>Cinema</h2>
<ul>
<li><b>Install.</b> Get Exo Cinema from the <a href="/download">download page</a> for 64-bit Windows 11.</li>
<li><b>Jellyfin only.</b> Home, Movies, Shows and playback come directly from the Jellyfin server you sign in to.</li>
<li><b>Updates.</b> Settings &gt; About &gt; Check for updates checks Exo\u2019s update mirror and installs compact file diffs.</li>
<li><b>Where data lives.</b> Caches and DPAPI-sealed server credentials stay in <code>%LocalAppData%\\ExoCinema</code> on your PC.</li>
<li><b>Diagnostics.</b> Crash, freeze and playback failure reports are scrubbed of addresses and titles before leaving; view what is sent in Settings &gt; About.</li>
</ul>
</article>
</div>

<div class="help-pair">
<section>
<h2>Send a message</h2>
<p>Report a bug or ask a question directly. Only the developer reads these messages. Stored 90 days; see <a href="/privacy#contact-form">Privacy</a>.</p>
<form class="form" data-contact novalidate>
<div class="field">
<label for="contact-email">Email <span class="hint">(optional)</span></label>
<input id="contact-email" name="email" data-field="email" type="email" autocomplete="email" maxlength="254" aria-describedby="contact-email-error">
<p class="field-error" id="contact-email-error" data-error="email" hidden></p>
</div>
<fieldset class="field app-field" data-field="app" aria-describedby="contact-app-error">
<legend>App</legend>
<div class="tiles">
<label class="tile"><input class="sr" type="radio" name="app" value="launcher" checked><span>Launcher</span></label>
<label class="tile"><input class="sr" type="radio" name="app" value="cinema"><span>Cinema</span></label>
<label class="tile"><input class="sr" type="radio" name="app" value="other"><span>Other</span></label>
</div>
<p class="field-error" id="contact-app-error" data-error="app" hidden></p>
</fieldset>
<div class="field">
<label for="contact-message">Message</label>
<textarea id="contact-message" name="message" data-field="message" rows="7" maxlength="4000" required aria-describedby="contact-message-error"></textarea>
<p class="field-error" id="contact-message-error" data-error="message" hidden></p>
</div>
<div class="vh" aria-hidden="true">
<label for="contact-website">Leave this empty</label>
<input id="contact-website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
</div>
<p class="form-status" data-status role="alert" hidden></p>
<div class="form-actions">
<button class="btn primary" type="submit">Send message</button>
</div>
</form>
<div class="done" data-contact-done role="status" tabindex="-1" hidden>
<p>Thanks — your message was delivered. If you left an email address, replies go there.</p>
</div>
<noscript><p>JavaScript is required for the contact form, or reach out on Discord.</p></noscript>
</section>

<div class="help-side">
<section class="card">
<h2>Discord</h2>
<p>Join the community for tips, release announcements and quick troubleshooting.</p>
<div class="row"><a class="btn primary small" href="https://discord.gg/44mXWhaHP4">Join Exo Discord</a></div>
</section>
<section class="card">
<h2>Release news</h2>
<ul>
<li><a href="/launcher/changelog">Launcher changelog</a></li>
<li><a href="/cinema/changelog">Cinema changelog</a></li>
<li><a href="/feed.xml">Release feed (Atom)</a></li>
</ul>
</section>
<section class="card">
<h2>Open source</h2>
<p>Verified source archives for open-source add-ons and helpers live on <a href="/source">/source</a>.</p>
</section>
</div>
</div>
</main>
${footer()}
</body>
</html>`
}

export function sourcePage() {
  return `${head({
    title: 'Source · Exo',
    description: 'Verified source archives for open-source parts Exo ships.',
    path: '/source',
  })}
<body>
${ICON_DEFS}
${header('/source')}
<main id="main" class="doc">
<div class="doc-head">
<span class="kicker">Open source</span>
<h1>Source</h1>
<p class="claim">Source archives for open-source helpers and tools Exo ships.</p>
<p>Unpack any archive with <code>tar -xzf</code> and verify its SHA-256 against the checksum below. Exo Launcher terms live on <a href="/license">License</a> and Exo Cinema terms on <a href="/legal/earlier-apps">Cinema terms</a>.</p>
</div>
<section>
<h2>Archives</h2>
<div class="cards" data-source>
<article class="card wide">
<p data-source-state>Loading archive list from <a href="/source/index.json">/source/index.json</a>…</p>
</article>
</div>
</section>
</main>
${footer()}
</body>
</html>`
}

const wrapLegalPage = ({ title, description, path, bodyFile, noindex = false }) => {
  const body = readFileSync(new URL(bodyFile, LEGAL_DIR), 'utf8')
  return `${head({ title, description, path, noindex })}
<body>
${ICON_DEFS}
${header('')}
<main id="main" class="doc">
${body}
</main>
${footer()}
</body>
</html>`
}

export const privacyPage = () => wrapLegalPage({
  title: 'Privacy · Exo',
  description: 'What each Exo app sends today, what stays on your PC, what the contact form keeps, and what getexo.app counts. No ads. Your data is never sold.',
  path: '/privacy',
  bodyFile: 'privacy.main.html',
})

export const licensePage = () => wrapLegalPage({
  title: 'License · Exo',
  description: 'The usage terms of Exo Launcher, and the licenses of what this site uses.',
  path: '/license',
  bodyFile: 'license.main.html',
})

export const cinemaTermsPage = () => wrapLegalPage({
  title: 'Cinema terms · Exo',
  description: 'Exo Cinema\u2019s usage terms and licence notices, its film credits, and one earlier privacy statement.',
  path: '/legal/earlier-apps',
  bodyFile: 'earlier-apps.main.html',
  noindex: true,
})

export function notFoundPage() {
  return `${head({
    title: 'Not found · Exo',
    description: 'This address isn\u2019t one of Exo\u2019s pages.',
    path: '/404',
    noindex: true,
  })}
<body>
${ICON_DEFS}
${header('')}
<main id="main" class="doc">
<div class="doc-head">
<h1>Page not found.</h1>
<p class="claim">This address isn\u2019t one of Exo\u2019s pages.</p>
<div class="row"><a class="btn primary" href="/">Go home</a><a class="btn" href="/download">Download Exo</a></div>
</div>
</main>
${footer()}
</body>
</html>`
}
