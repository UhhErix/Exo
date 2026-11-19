import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RELEASES, downloadUrl } from '../src/releases.js'
import { page } from '../src/pages.js'
import worker from '../src/worker.js'
import edge from '../../workers/exo-site/src/worker.js'
import www from '../../workers/exo-www/src/worker.js'

const env = { ASSETS: { fetch: () => new Response('Not found', { status: 404 }) } }
test('installer URLs stay pinned to the configured release tags', () => {
  assert.equal(downloadUrl('launcher'), 'https://github.com/UhhErix/Exo-Launcher/releases/download/v3.26.0/ExoLauncher-3.26.0-Setup.exe')
  assert.equal(downloadUrl('cinema'), 'https://github.com/UhhErix/Exo-Cinema/releases/download/v1.5.1/ExoCinema-1.5.1-Setup.exe')
  for (const html of [page(), page(true)]) assert.ok(html.includes('href="https://github.com/UhhErix/Exo-Launcher/releases/latest"'))
})
for (const [name, handler] of [['site', worker], ['edge', edge], ['www', www]]) {
  for (const app of Object.keys(RELEASES)) test(name + ' redirects ' + app + ' without update service', async () => {
    for (const method of ['GET', 'HEAD']) {
      const response = await handler.fetch(new Request('https://getexo.app/download/' + app, { method }), env, {})
      assert.equal(response.status, 302)
      assert.equal(response.headers.get('location'), downloadUrl(app))
    }
  })
}
test('unknown and empty downloads have no installer, and POST is rejected', async () => {
  assert.equal(downloadUrl('unknown'), null)
  assert.equal(downloadUrl(''), null)
  for (const path of ['/download/unknown', '/download/']) assert.equal((await worker.fetch(new Request('https://getexo.app' + path), env, {})).status, 404)
  assert.equal((await worker.fetch(new Request('https://getexo.app/download/launcher', { method: 'POST' }), env, {})).status, 405)
})
test('metadata is the published release, not the updater manifest', async () => {
  const response = await worker.fetch(new Request('https://getexo.app/api/cinema.json'), env, {})
  assert.equal((await response.json()).sha256, RELEASES.cinema.sha256)
})
test('both pages show release details and only GitHub installer URLs', () => {
  for (const html of [page(), page(true)]) {
    for (const app of Object.keys(RELEASES)) {
      assert.ok(html.includes(downloadUrl(app)))
      assert.ok(html.includes(RELEASES[app].sha256))
      assert.ok(html.includes(RELEASES[app].version))
      assert.ok(html.includes(RELEASES[app].bytes.toLocaleString('en-US')))
    }
    assert.ok(!html.includes('updates.getexo.app'))
    assert.ok(!/planned|become available/i.test(html))
    for (const release of Object.values(RELEASES)) assert.ok(html.includes(`href="https://github.com/${release.repo}/releases">Release notes and versions</a>`))
    assert.ok(!html.includes('href="/download/'))
  }
})
