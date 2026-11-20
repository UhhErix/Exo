import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RELEASES, downloadUrl } from '../src/releases.js'
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
} from '../src/pages.js'
import worker from '../src/worker.js'
import edge from '../../workers/exo-site/src/worker.js'
import www from '../../workers/exo-www/src/worker.js'

const staticEnv = { ASSETS: { fetch: () => new Response('Not found', { status: 404 }) } }

test('installer URLs stay pinned to the configured release tags', () => {
  assert.equal(downloadUrl('launcher'), 'https://github.com/UhhErix/Exo-Launcher/releases/download/v3.27.0/ExoLauncher-3.27.0-Setup.exe')
  assert.equal(downloadUrl('cinema'), 'https://github.com/UhhErix/Exo-Cinema/releases/download/v1.5.2/ExoCinema-1.5.2-Setup.exe')
})

for (const [name, handler] of [['site', worker], ['edge', edge], ['www', www]]) {
  for (const app of Object.keys(RELEASES)) {
    test(`${name} redirects ${app} to fallback installer without update service`, async () => {
      for (const method of ['GET', 'HEAD']) {
        const response = await handler.fetch(new Request(`https://getexo.app/download/${app}`, { method }), staticEnv, {})
        assert.equal(response.status, 302)
        assert.equal(response.headers.get('location'), downloadUrl(app))
      }
    })
  }
}

test('site & edge prefer live UPDATES mirror for /download and /api when available', async () => {
  const liveUpdatesEnv = {
    ASSETS: staticEnv.ASSETS,
    UPDATES_ORIGIN: 'https://updates.getexo.app',
    UPDATES: {
      async fetch(url) {
        if (String(url).includes('/v1/launcher/latest')) {
          return new Response(JSON.stringify({
            app: 'launcher',
            tag: 'v3.99.0',
            version: '3.99.0',
            files: { setup: 'https://updates.getexo.app/v1/launcher/download/v3.99.0/ExoLauncher-Setup.exe' },
            checks: { setup: { size: 123456789, sha256: 'a'.repeat(64) } },
          }), { status: 200, headers: { 'content-type': 'application/json' } })
        }
        return new Response('', { status: 404 })
      },
    },
  }
  const dl = await edge.fetch(new Request('https://getexo.app/download/launcher'), liveUpdatesEnv, {})
  assert.equal(dl.status, 302)
  assert.equal(dl.headers.get('location'), 'https://updates.getexo.app/v1/launcher/download/v3.99.0/ExoLauncher-Setup.exe')

  const api = await edge.fetch(new Request('https://getexo.app/api/launcher.json'), liveUpdatesEnv, {})
  assert.equal(api.status, 200)
  const body = await api.json()
  assert.equal(body.version, '3.99.0')
  assert.equal(body.sha256, 'a'.repeat(64))
  assert.equal(body.bytes, 123456789)
})

test('unknown and empty downloads return 404, and POST is rejected', async () => {
  assert.equal(downloadUrl('unknown'), null)
  assert.equal(downloadUrl(''), null)
  for (const path of ['/download/unknown', '/download/']) {
    assert.equal((await worker.fetch(new Request(`https://getexo.app${path}`), staticEnv, {})).status, 404)
  }
  assert.equal((await worker.fetch(new Request('https://getexo.app/download/launcher', { method: 'POST' }), staticEnv, {})).status, 405)
})

test('/api fallback serves configured release metadata when UPDATES is absent', async () => {
  const response = await worker.fetch(new Request('https://getexo.app/api/cinema.json'), staticEnv, {})
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
  const json = await response.json()
  assert.equal(json.sha256, RELEASES.cinema.sha256)
  assert.equal(json.version, RELEASES.cinema.version)
})

test('pages contain strict-CSP markup, Exo family icons, release hooks, and zero inline styles', () => {
  const all = [homePage(), launcherPage(), cinemaPage(), downloadPage(), helpPage(), sourcePage(), privacyPage(), licensePage(), cinemaTermsPage(), notFoundPage()]
  for (const html of all) {
    assert.ok(!/ style="/.test(html), 'inline style attribute found')
    assert.ok(!/<style[\s>]/i.test(html), 'inline <style> tag found')
    assert.ok(html.includes('href="/favicon.svg"'), 'missing Exo favicon.svg')
    assert.ok(html.includes('src="/favicon.svg"'), 'header/footer should use Exo family icon')
    assert.ok(!html.includes('__CF$cv$params'), 'Cloudflare injected script leaked into template')
  }

  for (const html of [homePage(), launcherPage(), cinemaPage(), downloadPage()]) {
    assert.ok(html.includes('data-release-version='), 'missing data-release-version hook for edge injection')
  }
  for (const html of [launcherPage(), downloadPage()]) {
    assert.ok(html.includes(RELEASES.launcher.sha256))
    assert.ok(html.includes(RELEASES.launcher.version))
    assert.ok(html.includes('data-copy-sha-for="launcher"'))
  }
  for (const html of [cinemaPage(), downloadPage()]) {
    assert.ok(html.includes(RELEASES.cinema.sha256))
    assert.ok(html.includes(RELEASES.cinema.version))
    assert.ok(html.includes('data-copy-sha-for="cinema"'))
  }
})

test('CSS and JS honor DECISIONS.md (no backdrop-filter) and Trusted Types (no innerHTML)', () => {
  const css = readFileSync(new URL('../src/site.css', import.meta.url), 'utf8')
  const js = readFileSync(new URL('../src/site.js', import.meta.url), 'utf8')
  const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
  const manifest = JSON.parse(readFileSync(new URL('../public/site.webmanifest', import.meta.url), 'utf8'))

  assert.ok(!/backdrop-filter/i.test(css), 'site.css must not use backdrop-filter')
  assert.ok(!/transition\s*:\s*all\b/i.test(css), 'site.css must never animate transition: all')
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'))
  assert.ok(css.includes('content-visibility: auto'))

  assert.ok(!/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval)\b/.test(js), 'site.js must avoid HTML/eval sinks for Trusted Types')
  assert.ok(!svg.includes('M17.69 13.00'), 'favicon.svg must not use the old Launcher 3-bar glyph')
  assert.ok(svg.includes('skewX(-11)'), 'favicon.svg must carry the Exo ligature mark')
  assert.equal(manifest.name, 'Exo')
})

test('built pages keep /download/<app> links so visitors route through exo-site -> updates.getexo.app', () => {
  for (const file of ['index.html', 'launcher.html', 'download.html']) {
    const html = readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8')
    assert.ok(html.includes('href="/download/launcher"'), `${file} missing /download/launcher`)
    assert.ok(!html.includes('/releases/download/'), `${file} should not hardcode GitHub .exe link`)
  }
  for (const file of ['cinema.html', 'download.html']) {
    const html = readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8')
    assert.ok(html.includes('href="/download/cinema"'), `${file} missing /download/cinema`)
  }
})

test('edge HTMLRewriter injects live UPDATES version, size, and SHA-256 into /download', async () => {
  const origRewriter = globalThis.HTMLRewriter
  globalThis.HTMLRewriter = class {
    constructor() { this.handlers = [] }
    on(selector, handler) { this.handlers.push([selector, handler]); return this }
    async transform(response) {
      let out = await response.text()
      for (const [selector, handler] of this.handlers) {
        const attr = selector.slice(1, -1)
        const re = new RegExp(`(<[a-z0-9-]+[^>]*\\b${attr}="([^"]+)"[^>]*>)([\\s\\S]*?)(</[a-z0-9-]+>)`, 'gi')
        out = out.replace(re, (full, open, val, inner, close) => {
          let nextOpen = open
          let nextInner = inner
          handler.element({
            getAttribute(name) {
              const m = new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(open)
              return m ? m[1] : null
            },
            setInnerContent(v) { nextInner = String(v) },
            setAttribute(name, v) {
              const attrRe = new RegExp(`\\b${name}="[^"]*"`, 'i')
              nextOpen = attrRe.test(nextOpen) ? nextOpen.replace(attrRe, `${name}="${v}"`) : nextOpen.replace(/>$/, ` ${name}="${v}">`)
            },
          })
          return `${nextOpen}${nextInner}${close}`
        })
      }
      return new Response(out, response)
    }
  }
  const shaL = 'a'.repeat(64)
  const shaC = 'c'.repeat(64)
  const env = {
    ASSETS: { fetch: () => new Response(downloadPage(), { headers: { 'content-type': 'text/html' } }) },
    UPDATES_ORIGIN: 'https://updates.getexo.app',
    UPDATES: {
      async fetch(url) {
        if (String(url).includes('/v1/launcher/latest')) {
          return new Response(JSON.stringify({
            app: 'launcher',
            tag: 'v3.99.0',
            version: '3.99.0',
            files: { setup: 'https://updates.getexo.app/v1/launcher/download/v3.99.0/ExoLauncher-Setup.exe' },
            checks: { setup: { size: 123456789, sha256: shaL } },
          }))
        }
        return new Response(JSON.stringify({
          app: 'cinema',
          tag: 'v1.9.2',
          version: '1.9.2',
          files: { setup: 'https://updates.getexo.app/v1/cinema/download/v1.9.2/ExoCinema-Setup.exe' },
          checks: { setup: { size: 52428800, sha256: shaC } },
        }))
      },
    },
  }
  try {
    const res = await edge.fetch(new Request('https://getexo.app/download'), env, {})
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8')
    const body = await res.text()
    assert.ok(body.includes('Version 3.99.0'))
    assert.ok(body.includes(shaL))
    assert.ok(body.includes(`data-copy-sha="${shaL}"`))
    assert.ok(body.includes('Version 1.9.2'))
    assert.ok(body.includes(shaC))
  } finally {
    if (origRewriter === undefined) delete globalThis.HTMLRewriter
    else globalThis.HTMLRewriter = origRewriter
  }
})
