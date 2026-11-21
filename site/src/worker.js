import { SECURITY_HEADERS } from './headers.js'
import { RELEASES, downloadUrl } from './releases.js'

const DOWNLOAD = /^\/download\/(launcher|cinema)\/?$/
const API = /^\/api\/(launcher|cinema)\.json$/
const CHANGELOG = /^\/(launcher|cinema|browser)\/changelog$/
const EDGE_PAGES = new Set(['/', '/launcher', '/cinema', '/download'])
const TAG = /^v\d{1,4}\.\d{1,4}\.\d{1,4}$/
const SHA256 = /^[0-9a-f]{64}$/i
const FRESH_SECONDS = 300

const remembered = new Map()
const answers = new Map()
const inflight = new Map()

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname

    let match
    if ((match = DOWNLOAD.exec(path)) || (match = API.exec(path))) {
      if (!['GET', 'HEAD'].includes(request.method)) {
        return finish(new Response('GET only', { status: 405, headers: { allow: 'GET, HEAD' } }))
      }
      const app = match[1]
      return finish(path.startsWith('/download/')
        ? await download(app, request, env)
        : await api(app, url, request, env, ctx))
    }

    if ((match = CHANGELOG.exec(path))) {
      if (!['GET', 'HEAD'].includes(request.method)) {
        return finish(new Response('GET only', { status: 405, headers: { allow: 'GET, HEAD' } }))
      }
      const { changelogResponse } = await import('./changelog-edge.js')
      return finish(await changelogResponse(match[1], request, env, ctx))
    }

    const assetResponse = await env.ASSETS.fetch(request)
    if (EDGE_PAGES.has(path) && request.method === 'GET' && assetResponse.ok) {
      const injected = await hydratePage(assetResponse, path, env)
      return finish(injected, true)
    }

    const isHtml = (assetResponse.headers.get('content-type') || '').includes('text/html')
    return finish(assetResponse, isHtml)
  },
}

async function download(app, request, env) {
  const live = await resolvedRelease(app, env)
  const location = live.setupUrl || downloadUrl(app)
  if (!location) return new Response('Unknown app', { status: 404 })
  return new Response(request.method === 'HEAD' ? null : '', {
    status: 302,
    headers: { location, 'cache-control': 'no-store' },
  })
}

async function api(app, url, request, env, ctx) {
  const headOnly = request.method === 'HEAD'
  const now = Date.now()
  const kept = answers.get(app)
  if (kept && kept.until > now) return json(kept.body, FRESH_SECONDS, 200, headOnly)

  const cache = globalThis.caches?.default
  const key = new Request(`${url.origin}/api/${app}.json`)
  const cached = await cache?.match(key)
  if (cached) return headOnly ? new Response(null, cached) : cached

  const info = await resolvedRelease(app, env)
  const body = {
    app,
    version: info.version,
    tag: info.tag,
    bytes: info.bytes,
    sha256: info.sha256,
  }
  const ttl = info.live ? FRESH_SECONDS : 60
  if (info.live && info.sha256) answers.set(app, { body, until: now + FRESH_SECONDS * 1e3 })
  const response = json(body, ttl, 200, headOnly)
  if (cache && info.live) ctx?.waitUntil?.(cache.put(key, response.clone()))
  return response
}

async function resolvedRelease(app, env) {
  const base = RELEASES[app]
  const latest = await newest(app, env)
  if (!latest) {
    return {
      version: base.version,
      tag: base.tag,
      bytes: base.bytes,
      sha256: base.sha256,
      setupUrl: downloadUrl(app),
      live: false,
    }
  }
  const version = typeof latest.version === 'string' && latest.version ? latest.version : latest.tag.slice(1)
  const checkSetup = latest.checks?.setup
  const checkSha = typeof checkSetup?.sha256 === 'string' && SHA256.test(checkSetup.sha256)
    ? checkSetup.sha256.toLowerCase()
    : null
  const sha = checkSha || (await sha256(latest, env)) || base.sha256
  const bytes = Number.isFinite(checkSetup?.size) && checkSetup.size > 0 ? checkSetup.size : base.bytes
  return {
    version,
    tag: latest.tag,
    bytes,
    sha256: sha,
    setupUrl: latest.files.setup,
    live: true,
  }
}

async function hydratePage(response, path, env) {
  if (typeof HTMLRewriter !== 'function' || !env?.UPDATES?.fetch) return response
  try {
    const apps = path === '/launcher' ? ['launcher'] : path === '/cinema' ? ['cinema'] : ['launcher', 'cinema']
    const resolved = await Promise.all(apps.map(async (app) => [app, await resolvedRelease(app, env)]))
    const info = Object.fromEntries(resolved)
    const formatSize = (bytes) => {
      if (!Number.isFinite(bytes) || bytes <= 0) return ''
      const mb = (bytes / (1024 * 1024)).toFixed(1)
      return `${mb} MB · ${bytes.toLocaleString('en-US')} bytes`
    }

    const rewriter = new HTMLRewriter()
      .on('[data-release-version]', {
        element(el) {
          const app = el.getAttribute('data-release-version')
          if (!info[app]) return
          const prefix = el.getAttribute('data-prefix') ?? 'Version '
          el.setInnerContent(`${prefix}${info[app].version}`)
        },
      })
      .on('[data-release-size]', {
        element(el) {
          const app = el.getAttribute('data-release-size')
          if (!info[app]) return
          el.setInnerContent(formatSize(info[app].bytes))
        },
      })
      .on('[data-release-sha]', {
        element(el) {
          const app = el.getAttribute('data-release-sha')
          if (!info[app]?.sha256) return
          el.setInnerContent(info[app].sha256)
        },
      })
      .on('[data-copy-sha-for]', {
        element(el) {
          const app = el.getAttribute('data-copy-sha-for')
          if (!info[app]?.sha256) return
          el.setAttribute('data-copy-sha', info[app].sha256)
        },
      })
    return rewriter.transform(response)
  } catch {
    return response
  }
}

async function newest(app, env) {
  if (!env?.UPDATES?.fetch) return null
  const kept = remembered.get(app)
  if (kept && kept.until > Date.now()) return kept.latest
  const existing = inflight.get(app)
  if (existing) return existing
  const req = (async () => {
    try {
      const origin = env.UPDATES_ORIGIN || 'https://updates.getexo.app'
      const response = await env.UPDATES.fetch(`${origin}/v1/${app}/latest`, {
        headers: { 'user-agent': 'exo-site' },
        signal: AbortSignal.timeout(3000),
      })
      if (!response.ok) return null
      const latest = await response.json()
      if (!TAG.test(latest?.tag) || typeof latest?.files?.setup !== 'string') return null
      remembered.set(app, { latest, until: Date.now() + FRESH_SECONDS * 1e3 })
      return latest
    } catch {
      return null
    }
  })().finally(() => inflight.delete(app))
  inflight.set(app, req)
  return req
}

async function sha256(latest, env) {
  if (!latest?.files?.sha256 || !env?.UPDATES?.fetch) return null
  try {
    const origin = new URL(latest.files.sha256).origin
    let response = await env.UPDATES.fetch(latest.files.sha256, {
      redirect: 'manual',
      headers: { 'user-agent': 'exo-site' },
      signal: AbortSignal.timeout(3000),
    })
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      const next = new URL(location, latest.files.sha256)
      if (next.protocol !== 'https:' || next.origin !== origin) return null
      response = await env.UPDATES.fetch(next.href, {
        headers: { 'user-agent': 'exo-site' },
        signal: AbortSignal.timeout(3000),
      })
    }
    if (!response.ok) return null
    const hash = (await response.text()).trim().split(/\s+/)[0]
    return SHA256.test(hash) ? hash.toLowerCase() : null
  } catch {
    return null
  }
}

function json(body, seconds, status = 200, headOnly = false) {
  return new Response(headOnly ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': seconds ? `public, max-age=${seconds}` : 'no-store',
    },
  })
}

function finish(response, isHtml = false) {
  const out = new Response(response.body, response)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value)
  if (isHtml) {
    out.headers.set('content-type', 'text/html; charset=utf-8')
    if (!out.headers.has('cache-control')) {
      out.headers.set('cache-control', 'public, max-age=60, stale-while-revalidate=3600')
    }
  }
  out.headers.delete('set-cookie')
  return out
}
