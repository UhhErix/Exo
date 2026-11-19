import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker from '../src/worker.js'

const origin = 'https://updates.example.com'

test('the latest release is read from the mirror for GET and HEAD', async () => {
  const env = {
    MIRROR: {
      async get(key) {
        assert.equal(key, 'cinema/latest.json')
        return { json: async () => ({ tag: 'v1.5.1' }) }
      },
    },
  }
  const url = `${origin}/v1/cinema/latest`
  const response = await worker.fetch(new Request(url), env, {})
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'public, max-age=60')
  assert.equal(response.headers.get('cdn-cache-control'), 'max-age=60')
  const release = await response.json()
  assert.equal(release.version, '1.5.1')
  assert.equal(release.files.setup, `${origin}/v1/cinema/download/v1.5.1/ExoCinema-Setup.exe`)

  const head = await worker.fetch(new Request(url, { method: 'HEAD' }), env, {})
  assert.equal(head.status, 200)
  assert.equal(head.headers.get('etag'), response.headers.get('etag'))
  assert.equal(await head.text(), '')

  const conditional = await worker.fetch(new Request(url, {
    headers: { 'if-none-match': response.headers.get('etag') },
  }), env, {})
  assert.equal(conditional.status, 304)
  assert.equal(conditional.headers.get('cache-control'), response.headers.get('cache-control'))
  assert.equal(await conditional.text(), '')
})

test('the announcement route cannot write or call an external service', async () => {
  const request = new Request(`${origin}/v1/cinema/announce`, {
    method: 'POST',
    body: JSON.stringify({ tag: 'v1.5.1' }),
  })
  const response = await worker.fetch(request, {}, {})
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET, HEAD')
  assert.equal(worker.scheduled, undefined)
})
