// npm run build. Writes everything in public/assets from pictures/ and src/, points the pages at the new names,
// writes each app's Changelog page from its CHANGELOG.md at the update address (the Worker renders the same pages at the edge, from
// the same functions and src/changelog.html), and writes public/_headers from src/headers.js. /assets/* is cached
// forever, so each name carries a content hash.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import sharp from 'sharp'
import { SECURITY_HEADERS } from './src/headers.js'
import { page } from './src/pages.js'
import { rewriteDownloadLinks } from './src/download-links.js'
import { CHANGELOG_APPS, changelogUrl, renderChangelog } from './src/changelog.js'
const ASSETS = 'public/assets'
writeFileSync('public/index.html', page())
writeFileSync('public/cinema.html', page(true))
// The hand-written pages whose asset names the build points at. The Changelog pages are written below, from the template.
const PAGES = ['public/index.html', 'public/cinema.html', 'public/404.html', 'public/privacy.html', 'public/license.html', 'public/legal/earlier-apps.html']
const WIDTHS = [960, 1920, 3840]
const AVIF = { quality: 50, effort: 6, chromaSubsampling: '4:4:4' }
const OG = 'library'
mkdirSync(ASSETS, { recursive: true })
const hash = (...parts) => parts.reduce((h, part) => h.update(part), createHash('sha256')).digest('hex').slice(0, 10)
const wanted = new Set()
/** Writes a text or binary asset under its hash and returns the name. */
function asset(stem, ext, data) {
  const name = `${stem}.${hash(data)}.${ext}`
  writeFileSync(join(ASSETS, name), data)
  wanted.add(name)
  return name
}
const font = asset('geist', 'woff2', readFileSync('src/geist.woff2'))
const css = asset('site', 'css', readFileSync('src/site.css', 'utf8').replace('geist.woff2', font))
const js = asset('site', 'js', readFileSync('src/site.js'))
// Pictures: pictures/<slot>.<png|jpg|webp> is the slot's one source; the name carries the source's hash, so an
// unchanged picture isn't encoded again.
const srcsets = new Map()
let og
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
  if (slot === OG) og = asset('og', 'jpg', await sharp(data).resize(1200, 675).jpeg({ quality: 80, mozjpeg: true }).toBuffer())
}
// src/assets.json: the names the Worker's Changelog page (src/changelog-edge.js) links to, so it names the same files as public/.
const assets = { font, css, og }
writeFileSync('src/assets.json', `${JSON.stringify(assets, null, 2)}\n`)
// The Changelog pages: every release, from each app's CHANGELOG.md, so a release is on them after the next deploy.
/** The file, with three tries: the update address can be slow for a moment, and a build shouldn't fail for that. */
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
  const html = rewriteDownloadLinks(readFileSync(page, 'utf8'))
    .replace(/\/assets\/geist\.\w+\.woff2/g, `/assets/${font}`)
    .replace(/\/assets\/site\.\w+\.css/g, `/assets/${css}`)
    .replace(/\/assets\/site\.\w+\.js/g, `/assets/${js}`)
    .replace(/\/assets\/og\.\w+\.jpg/g, `/assets/${og}`)
    .replace(/src="\/assets\/([a-z]+)-\d+\.\w+\.avif" srcset="[^"]*"/g, (_, slot) => {
      const names = srcsets.get(slot)
      if (!names) throw new Error(`${page} has the slot "${slot}", but pictures/ has no picture for it`)
      used.add(slot)
      return `src="/assets/${names[0][0]}" srcset="${names.map(([name, w]) => `/assets/${name} ${w}w`).join(', ')}"`
    })
  writeFileSync(page, html)
}
for (const slot of srcsets.keys()) if (!used.has(slot)) throw new Error(`pictures/ has "${slot}", but no page shows it`)
for (const name of readdirSync(ASSETS)) if (!wanted.has(name)) rmSync(join(ASSETS, name))
const day = 'Cache-Control: public, max-age=86400'
writeFileSync('public/_headers', `# Written by build.mjs from src/headers.js.
/*
${Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${value}`).join('\n')}
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/cinema-assets/*
  Cache-Control: public, max-age=31536000, immutable
${['/robots.txt', '/sitemap.xml', '/site.webmanifest', '/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/exo-192.png', '/exo-512.png'].map((path) => `${path}\n  ${day}`).join('\n\n')}
`)
console.log(`${wanted.size} files in ${ASSETS}`)
