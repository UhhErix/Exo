// The Worker: the cron run every 30 minutes, GET /v1/latest (the public versions), GET /avatars/<vendor>.png (the card logos),
// and /run (the dry run and the real run, behind RUN_TOKEN).
import { AVATARS } from './avatar-data.js'
import { latestJson } from './latest.js'
import { runCheck } from './run.js'
import { Store } from './store.js'

const LATEST_MAX_AGE = 300
const AVATAR_MAX_AGE = 31536000
const fetchFromNetwork = (...args) => globalThis.fetch(...args)
const avatarBytesCache = new Map()

export default {
  async fetch(request, env, ctx) {
    return handle(request, env, { ctx })
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduledRun(env))
  },
}

/** The cron run: a real run. Failures are logged (without the webhook) and the next run tries again. */
export async function scheduledRun(env, { fetcher = fetchFromNetwork } = {}) {
  try {
    const report = await runCheck({ env, store: new Store(env.DRIVERS), fetcher })
    if (report.skipped) console.log(`driver watch: ${report.skipped}`)
    for (const { product, error } of report.errors) console.error(`driver watch: ${product}: ${error}`)
  } catch (error) {
    console.error(`driver watch: run failed: ${error.message}`)
  }
}

export async function handle(request, env = {}, { fetcher = fetchFromNetwork, now = () => new Date(), ctx } = {}) {
  try {
    const url = new URL(request.url)
    if (url.pathname === '/v1/latest') return await onlyGet(request, () => latest(request, env, ctx))
    if (url.pathname.startsWith('/avatars/')) return onlyGet(request, () => avatar(url.pathname.slice('/avatars/'.length)))
    if (url.pathname === '/run') return await run(request, url, env, { fetcher, now })
    return text('Not found', 404)
  } catch (error) {
    console.error(`driver watch: request failed: ${error.message}`)
    return json({ error: 'the driver watch failed' }, 500)
  }
}

function onlyGet(request, respond) {
  return request.method === 'GET' ? respond() : text('Method not allowed', 405, { allow: 'GET' })
}

async function latest(request, env, ctx) {
  const cache = globalThis.caches?.default
  const cached = cache ? await cache.match(request) : undefined
  if (cached) return cached
  const response = json(await latestJson(new Store(env.DRIVERS)), 200, { 'cache-control': `public, max-age=${LATEST_MAX_AGE}` })
  if (cache) {
    const copy = response.clone()
    if (ctx?.waitUntil) ctx.waitUntil(cache.put(request, copy))
    else await cache.put(request, copy)
  }
  return response
}

function avatar(file) {
  const bytes = avatarBytes(file)
  if (!bytes) return text('Not found', 404)
  return new Response(bytes, {
    headers: { 'content-type': 'image/png', 'cache-control': `public, max-age=${AVATAR_MAX_AGE}, immutable` },
  })
}

/** The logo's bytes from the base64 module, or null for a name that is not one of the three. */
function avatarBytes(file) {
  if (!Object.hasOwn(AVATARS, file)) return null
  if (!avatarBytesCache.has(file)) {
    avatarBytesCache.set(file, Uint8Array.from(atob(AVATARS[file]), (char) => char.charCodeAt(0)))
  }
  return avatarBytesCache.get(file)
}

/** GET /run?dry=1 answers without posting; POST /run is the real run; POST /run?dry=1 is a dry run too. */
async function run(request, url, env, { fetcher, now }) {
  if (!['GET', 'POST'].includes(request.method)) return text('Method not allowed', 405, { allow: 'GET, POST' })
  const dryRun = url.searchParams.get('dry') === '1'
  if (request.method === 'GET' && !dryRun) return text('GET /run needs ?dry=1; a real run is POST /run', 405, { allow: 'POST' })
  if (!env.RUN_TOKEN) return json({ error: 'RUN_TOKEN is not set' }, 503)
  if (!bearerMatches(request.headers.get('authorization'), env.RUN_TOKEN)) {
    return json({ error: 'unauthorized' }, 401, { 'www-authenticate': 'Bearer' })
  }
  const report = await runCheck({ env, store: new Store(env.DRIVERS), fetcher, dryRun, now })
  return json(report, 200, { 'cache-control': 'no-store' })
}

/** The Authorization header is exactly "Bearer <token>", compared without stopping at the first different byte. */
function bearerMatches(header, token) {
  const given = new TextEncoder().encode(header ?? '')
  const want = new TextEncoder().encode(`Bearer ${token}`)
  if (given.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= given[i] ^ want[i]
  return diff === 0
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

function text(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } })
}
