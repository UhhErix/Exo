// npm test: the Changelog renderer that build.mjs and the Worker share (src/changelog.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CHANGELOG_APPS, changelogUrl, renderChangelog, releases } from '../src/changelog.js'

const ASSETS = {
  font: 'exoline.aaaaaaaaaa.woff2',
  css: 'site.bbbbbbbbbb.css',
  js: 'site.dddddddddd.js',
  og: 'og-launcher.cccccccccc.jpg',
  ogLauncher: 'og-launcher.cccccccccc.jpg',
  ogCinema: 'og-cinema.eeeeeeeeee.jpg',
}
const TEMPLATE = readFileSync(new URL('../src/changelog.html', import.meta.url), 'utf8')

test('a release is a section with its heading, paragraphs and bullets', () => {
  const html = releases('# Changelog\n## 1.0.0 — May 1, 2026\nIntro line.\n- **Fixed** the `thing`.\n')
  assert.equal(html, '<section><h2>1.0.0 — May 1, 2026</h2><p>Intro line.</p><ul><li><b>Fixed</b> the <code>thing</code>.</li></ul></section>')
})

test('Unreleased is left out', () => {
  assert.equal(releases('## Unreleased\n- Not yet.\n'), '')
})

test('markup in the changelog is escaped, not rendered', () => {
  const html = releases('## 1.0.0\n- <script>alert(1)</script> & "quotes"\n')
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;'))
})

test('links only go to https, and their text is escaped', () => {
  const ok = releases('## 1.0.0\n- See [the notes](https://example.com/a?b=1&c=2).\n')
  assert.ok(ok.includes('<a href="https://example.com/a?b=1&amp;c=2">the notes</a>'))
  const bad = releases('## 1.0.0\n- Click [here](javascript:alert(1)) or [there](http://example.com).\n')
  assert.ok(!bad.includes('href='), 'only https links become anchors')
  assert.ok(bad.includes('here') && bad.includes('there'))
})

test('the Verified/Checked note at the end of a bullet is dropped', () => {
  assert.equal(releases('## 1.0.0\n- Works now. _Checked in code only._\n'), '<section><h2>1.0.0</h2><ul><li>Works now.</li></ul></section>')
})

test('a page fills every placeholder and nothing else', () => {
  const page = renderChangelog(TEMPLATE, { app: 'launcher', name: 'Launcher', home: '/launcher' }, '## 1.0.0\n- Notes with {{app}} inside.\n', ASSETS)
  assert.ok(page.includes('<title>Exo Launcher changelog · Exo</title>'))
  assert.ok(page.includes('/assets/exoline.aaaaaaaaaa.woff2'))
  assert.ok(page.includes('/assets/site.bbbbbbbbbb.css'))
  assert.ok(page.includes('/assets/site.dddddddddd.js'))
  assert.ok(page.includes('/assets/og-launcher.cccccccccc.jpg'))
  assert.ok(page.includes('{{app}} inside'), 'a placeholder inside a release is text, not filled again')
  assert.ok(!/\{\{\w+\}\}/.test(page.replace('{{app}} inside', '')), 'no placeholder is left unfilled')
})

test('a template placeholder nothing fills is an error', () => {
  assert.throws(() => renderChangelog('<p>{{missing}}</p>', { app: 'x', name: 'X', home: '/' }, '', ASSETS), /missing/)
})

test('each app\'s changelog comes from the update address, never from GitHub', () => {
  assert.equal(changelogUrl('launcher'), 'https://updates.getexo.app/v1/launcher/changelog')
  assert.equal(changelogUrl('browser', 'http://127.0.0.1:9'), 'http://127.0.0.1:9/v1/browser/changelog')
  assert.deepEqual(CHANGELOG_APPS.map(({ app }) => app), ['launcher', 'cinema', 'browser'])
  assert.ok(CHANGELOG_APPS.every((entry) => !('repo' in entry)), 'no entry names a GitHub repo')
})

test('nothing the site builds or serves names GitHub for a changelog', () => {
  const files = ['build.mjs', '../workers/exo-site/wrangler.toml', 'src/changelog.js', 'src/changelog-edge.js', 'src/worker.js']
  for (const file of files) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.ok(!/githubusercontent|UhhErix|CHANGELOG_ORIGIN/.test(text), `${file} still names GitHub or CHANGELOG_ORIGIN`)
  }
})
