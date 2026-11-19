// npm test: exo-site (workers/exo-site) serves this directory's code, with one copy of the headers and Changelog page.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import edge from '../../workers/exo-site/src/worker.js'
import { SECURITY_HEADERS } from '../src/headers.js'

const env = { ASSETS: { fetch: () => new Response('page', { headers: { 'set-cookie': 'a=b' } }) }, SOURCE: { get: async () => null } }
const csp = (response) => response.headers.get('content-security-policy')

test('the production CSP lets the site reach the report address', () => {
  assert.match(SECURITY_HEADERS['Content-Security-Policy'], /(^|; )connect-src 'self' https:\/\/reports\.getexo\.app(;|$)/)
})

test('exo-site sends the site\'s headers on pages and on /source', async () => {
  for (const path of ['/', '/launcher/changelog.html', '/source/index.json']) {
    const response = await edge.fetch(new Request(`https://getexo.app${path}`), env, {})
    assert.equal(csp(response), SECURITY_HEADERS['Content-Security-Policy'], path)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.equal(response.headers.get(name), value, `${path} ${name}`)
  }
})

test('exo-site keeps no copy of a site module', () => {
  const site = new Set(readdirSync(new URL('../src/', import.meta.url)))
  const copies = readdirSync(new URL('../../workers/exo-site/src/', import.meta.url)).filter((name) => name !== 'worker.js' && site.has(name))
  assert.deepEqual(copies, [], 'the site code lives in site/src; workers/exo-site/src only adds to it')
})
