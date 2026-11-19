// The Changelog pages at the edge. Each one is its app's CHANGELOG.md from the update address (/v1/<app>/changelog,
// through the UPDATES binding), rendered by the same code as build.mjs. The rendered page is kept in the Cache API with
// the time it was last tried: for 15 minutes it is served without asking the update address; after that it is served at
// once and refreshed behind the response (stale-while-revalidate). When the update address fails (a timeout, an error,
// a page that isn't a changelog), the last good copy stands, and a failed try waits another 15 minutes. With no copy at
// all, the static page from build.mjs answers. A visitor never sees the error.
import template from './changelog.html'
import assets from './assets.json'
import { CHANGELOG_APPS, changelogUrl, renderChangelog } from './changelog.js'

const FRESH_MS = 15 * 60 * 1000 // CHANGELOG_FRESH_SECONDS, when set, is for tests: a shorter window to see the refresh
const KEEP_SECONDS = 24 * 60 * 60
const TIMEOUT_MS = 8000
const MAX_BYTES = 4 * 1024 * 1024
// One upstream request per app at a time, however many visitors arrive while it runs.
const running = new Map()

/** The page for /<app>/changelog. `ctx` is the fetch's ExecutionContext, for the refresh that runs after the response. */
export async function changelogResponse(app, request, env, ctx) {
  const entry = CHANGELOG_APPS.find((item) => item.app === app)
  const cache = globalThis.caches?.default
  const key = new Request(new URL(`/__changelog/${app}`, request.url))
  const kept = await read(cache, key)
  const fresh = Number(env.CHANGELOG_FRESH_SECONDS) * 1000 || FRESH_MS
  if (kept && Date.now() - kept.triedAt < fresh) return page(kept.html, 'edge')
  if (kept) {
    ctx.waitUntil(refresh(entry, env, cache, key, kept))
    return page(kept.html, 'stale')
  }
  const html = await refresh(entry, env, cache, key, null)
  if (html) return page(html, 'upstream')
  // Nothing kept and GitHub unavailable: the page build.mjs wrote, from the same template.
  const fallback = await env.ASSETS.fetch(request)
  return new Response(fallback.body, { status: fallback.status, headers: { ...Object.fromEntries(fallback.headers), 'cache-control': 'public, max-age=60', 'x-changelog': 'static' } })
}

function page(html, source) {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400',
      'x-changelog': source,
    },
  })
}

/** { html, triedAt, etag } from the Cache API, or null. A cache that fails is the same as an empty one. */
async function read(cache, key) {
  try {
    const hit = cache && (await cache.match(key))
    if (!hit) return null
    return { html: await hit.text(), triedAt: Number(hit.headers.get('x-tried-at')) || 0, etag: hit.headers.get('x-etag') || null }
  } catch {
    return null
  }
}

async function store(cache, key, { html, triedAt, etag }) {
  if (!cache) return
  try {
    await cache.put(key, new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': `public, max-age=${KEEP_SECONDS}`, 'x-tried-at': String(triedAt), 'x-etag': etag || '' },
    }))
  } catch {
    // The page still goes out; it just isn't kept.
  }
}

function refresh(entry, env, cache, key, kept) {
  if (!running.has(entry.app)) running.set(entry.app, load(entry, env, cache, key, kept).finally(() => running.delete(entry.app)))
  return running.get(entry.app)
}

/** Asks the update address, once. Returns the page to serve, or null when there is none. */
async function load(entry, env, cache, key, kept) {
  const triedAt = Date.now()
  const headers = { 'user-agent': 'exo-site' }
  if (kept?.etag) headers['if-none-match'] = kept.etag
  try {
    const response = await env.UPDATES.fetch(changelogUrl(entry.app, env.UPDATES_ORIGIN), { headers, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (response.status === 304 && kept) {
      await store(cache, key, { html: kept.html, triedAt, etag: kept.etag })
      return kept.html
    }
    if (!response.ok) {
      response.body?.cancel()
      throw new Error(`the update address answered ${response.status}`)
    }
    const markdown = await readCapped(response)
    if (!/^## /m.test(markdown)) throw new Error('not a changelog')
    const html = renderChangelog(template, entry, markdown, assets)
    await store(cache, key, { html, triedAt, etag: response.headers.get('etag') })
    return html
  } catch {
    if (kept) await store(cache, key, { html: kept.html, triedAt, etag: kept.etag })
    return kept?.html ?? null
  }
}

/** The body as text, read at most MAX_BYTES: a bigger file is an error, not a page to render. */
async function readCapped(response) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('too large')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) {
      await reader.cancel()
      throw new Error('too large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}
