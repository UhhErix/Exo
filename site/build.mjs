// npm run build. Encodes 16:9 pictures into responsive AVIFs + OG JPEGs, hashes font/css/js into public/assets/,
// builds every HTML page, fetches live changelogs for /<app>/changelog.html, and writes public/_headers.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import sharp from 'sharp'
import { SECURITY_HEADERS } from './src/headers.js'
import {
  homePage,
  launcherPage,
  cinemaPage,
  downloadPage,
  helpPage,
  sourcePage,
  privacyPage,
  licensePage,
  cinemaTermsPage,
  notFoundPage,
} from './src/pages.js'
import { CHANGELOG_APPS, changelogUrl, renderChangelog } from './src/changelog.js'

const ASSETS = 'public/assets'
const WIDTHS = [960, 1920, 3840]
const AVIF = { quality: 52, effort: 6, chromaSubsampling: '4:4:4' }

mkdirSync(ASSETS, { recursive: true })
mkdirSync('public/legal', { recursive: true })

// Ensure site/src/exoline.woff2 is copied if only present in packages/design-system/fonts/out/
if (!existsSync('src/exoline.woff2') && existsSync('../packages/design-system/fonts/out/Exoline-Variable.woff2')) {
  copyFileSync('../packages/design-system/fonts/out/Exoline-Variable.woff2', 'src/exoline.woff2')
}

const hash = (...parts) => parts.reduce((h, part) => h.update(part), createHash('sha256')).digest('hex').slice(0, 10)
const wanted = new Set()

function asset(stem, ext, data) {
  const name = `${stem}.${hash(data)}.${ext}`
  writeFileSync(join(ASSETS, name), data)
  wanted.add(name)
  return name
}

const font = asset('exoline', 'woff2', readFileSync('src/exoline.woff2'))
const css = asset('site', 'css', readFileSync('src/site.css', 'utf8').replace('exoline.woff2', font))
const js = asset('site', 'js', readFileSync('src/site.js'))

const srcsets = new Map()
let ogLauncher
let ogCinema

for (const file of readdirSync('pictures')) {
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extname(file))) continue
  const slot = file.slice(0, -extname(file).length)
  const data = readFileSync(join('pictures', file))
  const { width, height } = await sharp(data).metadata()
  if (Math.abs(width / height - 16 / 9) > 0.01) throw new Error(`pictures/${file} is ${width}x${height}; every slot is 16:9`)
  const tag = hash(data, JSON.stringify(AVIF))
  const sizes = WIDTHS.filter((w) => w <= width)
  if (!sizes.length) throw new Error(`pictures/${file} is ${width} wide; a slot needs at least ${WIDTHS[0]}`)
  const names = []
  for (const w of sizes) {
    const name = `${slot}-${w}.${tag}.avif`
    if (!existsSync(join(ASSETS, name))) await sharp(data).resize(w).avif(AVIF).toFile(join(ASSETS, name))
    wanted.add(name)
    names.push([name, w])
  }
  srcsets.set(slot, names)
  if (slot === 'library') {
    ogLauncher = asset('og-launcher', 'jpg', await sharp(data).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer())
  }
  if (slot === 'cinema-hero') {
    ogCinema = asset('og-cinema', 'jpg', await sharp(data).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer())
  }
}

if (!ogLauncher) throw new Error('Missing pictures/library.* for og-launcher image')
if (!ogCinema) ogCinema = ogLauncher

const assets = { font, css, js, og: ogLauncher, ogLauncher, ogCinema }
writeFileSync('src/assets.json', `${JSON.stringify(assets, null, 2)}\n`)

writeFileSync('public/index.html', homePage())
writeFileSync('public/launcher.html', launcherPage())
writeFileSync('public/cinema.html', cinemaPage())
writeFileSync('public/download.html', downloadPage())
writeFileSync('public/help.html', helpPage())
writeFileSync('public/source.html', sourcePage())
writeFileSync('public/privacy.html', privacyPage())
writeFileSync('public/license.html', licensePage())
writeFileSync('public/legal/earlier-apps.html', cinemaTermsPage())
writeFileSync('public/404.html', notFoundPage())

const PAGES = [
  'public/index.html',
  'public/launcher.html',
  'public/cinema.html',
  'public/download.html',
  'public/help.html',
  'public/source.html',
  'public/privacy.html',
  'public/license.html',
  'public/legal/earlier-apps.html',
  'public/404.html',
]

async function changelogFile(app) {
  let last = 'did not answer'
  for (const wait of [0, 5000, 15000]) {
    await new Promise((done) => setTimeout(done, wait))
    try {
      const response = await fetch(changelogUrl(app), { signal: AbortSignal.timeout(20000) })
      if (response.ok) return response.text()
      last = `answered ${response.status}`
    } catch (error) {
      last = error.message
    }
  }
  if (existsSync(`public/${app}/changelog.html`)) {
    console.warn(`${app}'s changelog ${last}; preserving the checked-in static fallback`)
    return null
  }
  throw new Error(`${app}'s changelog ${last}`)
}

const template = readFileSync('src/changelog.html', 'utf8')
for (const { app, name, home } of CHANGELOG_APPS) {
  mkdirSync(`public/${app}`, { recursive: true })
  const markdown = await changelogFile(app)
  if (markdown !== null) writeFileSync(`public/${app}/changelog.html`, renderChangelog(template, { app, name, home }, markdown, assets))
  PAGES.push(`public/${app}/changelog.html`)
}

const used = new Set()
for (const page of PAGES) {
  const html = readFileSync(page, 'utf8')
    .replace(/\/assets\/(?:exoline|geist)\.\w+\.woff2/g, `/assets/${font}`)
    .replace(/\/assets\/site\.\w+\.css/g, `/assets/${css}`)
    .replace(/\/assets\/site\.\w+\.js/g, `/assets/${js}`)
    .replace(/\/assets\/(?:og-launcher|og)\.\w+\.jpg/g, `/assets/${ogLauncher}`)
    .replace(/\/assets\/og-cinema\.\w+\.jpg/g, `/assets/${ogCinema}`)
    .replace(/src="\/assets\/([a-z-]+)-\d+\.\w+\.avif" srcset="[^"]*"/g, (_, slot) => {
      const names = srcsets.get(slot)
      if (!names) throw new Error(`${page} has the slot "${slot}", but pictures/ has no picture for it`)
      used.add(slot)
      return `src="/assets/${names[0][0]}" srcset="${names.map(([name, w]) => `/assets/${name} ${w}w`).join(', ')}"`
    })
  writeFileSync(page, html)
}

for (const slot of srcsets.keys()) if (!used.has(slot)) throw new Error(`pictures/ has "${slot}", but no page shows it`)
for (const name of readdirSync(ASSETS)) if (!wanted.has(name)) rmSync(join(ASSETS, name))

// Remove stale directories left over from earlier trailing-slash builds so drop-trailing-slash always answers 200 OK
for (const legacy of ['public/launcher/index.html', 'public/cinema/index.html', 'public/download/index.html', 'public/help/index.html', 'public/source/index.html', 'public/privacy/index.html', 'public/license/index.html']) {
  if (existsSync(legacy)) rmSync(legacy)
}

const htmlCache = 'Cache-Control: public, max-age=60, stale-while-revalidate=3600'
const dayCache = 'Cache-Control: public, max-age=86400'
writeFileSync('public/_headers', `# Written by build.mjs from src/headers.js.
/*
${Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${value}`).join('\n')}

/*.html
  ${htmlCache}

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/brand/*
  ${dayCache}

/cinema-assets/*
  Cache-Control: public, max-age=31536000, immutable

${['/robots.txt', '/sitemap.xml', '/feed.xml', '/site.webmanifest', '/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/exo-192.png', '/exo-512.png'].map((path) => `${path}\n  ${dayCache}`).join('\n\n')}
`)

console.log(`${wanted.size} files in ${ASSETS}`)
