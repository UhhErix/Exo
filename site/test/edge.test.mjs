// npm test: exo-site (workers/exo-site) serves this directory's code, with one copy of the headers, Edge pages, and Changelog page.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import edge from '../../workers/exo-site/src/worker.js'
import { SECURITY_HEADERS } from '../src/headers.js'

const env = {
  ASSETS: { fetch: () => new Response('<!doctype html><title>x</title>', { headers: { 'content-type': 'text/html', 'set-cookie': 'a=b' } }) },
  SOURCE: { get: async () => null },
}
const csp = (response) => response.headers.get('content-security-policy')

test('the production CSP lets the site reach the report address and enforces Trusted Types', () => {
  assert.match(SECURITY_HEADERS['Content-Security-Policy'], /(^|; )connect-src 'self' https:\/\/reports\.getexo\.app(;|$)/)
  assert.match(SECURITY_HEADERS['Content-Security-Policy'], /(^|; )require-trusted-types-for 'script'(;|$)/)
  assert.equal(SECURITY_HEADERS['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains; preload')
})

test('exo-site sends headers, utf-8 charset on HTML, and strips set-cookie', async () => {
  for (const path of ['/', '/launcher', '/cinema', '/download', '/launcher/changelog.html', '/source/index.json']) {
    const response = await edge.fetch(new Request(`https://getexo.app${path}`), env, {})
    assert.equal(csp(response), SECURITY_HEADERS['Content-Security-Policy'], path)
    assert.equal(response.headers.get('set-cookie'), null)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.equal(response.headers.get(name), value, `${path} ${name}`)
    if (!path.endsWith('.json')) assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8', path)
  }
})

test('exo-site keeps no copy of a site module', () => {
  const site = new Set(readdirSync(new URL('../src/', import.meta.url)).filter((name) => name !== 'legal'))
  const copies = readdirSync(new URL('../../workers/exo-site/src/', import.meta.url)).filter((name) => name !== 'worker.js' && site.has(name))
  assert.deepEqual(copies, [], 'the site code lives in site/src; workers/exo-site/src only adds to it')
})
