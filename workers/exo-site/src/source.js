// /source: the source archives of Exo's open-source add-ons (Exo Mouse, Exo Shaders, Exo Shield, Exo Capture up to 3.17.1),
// kept in the SOURCE bucket (R2, `exo-source`). The page reads source/index.json; each archive is at
// source/<add-on>/<add-on>-<version>.tar.gz. Nothing here touches GitHub. A missing index is the page's quiet state.

// An archive's path: /source/<add-on>/<add-on>-<version>.tar.gz, one folder and one plain file name, nothing that climbs.
export const SOURCE_FILE = /^\/source\/([a-z0-9-]{1,40})\/([A-Za-z0-9._-]{1,120}\.tar\.gz)$/

const NAME = /^[a-z0-9-]{1,40}$/
const VERSION = /^\d{1,4}\.\d{1,4}\.\d{1,4}(?:-[0-9A-Za-z.]{1,20})?$/
const SHA256 = /^[0-9a-f]{64}$/
const MAX_ADDONS = 20
const MAX_RELEASES = 100
const MAX_BYTES = 10 * 1024 * 1024 * 1024

/**
 * The index the page reads, cleaned to the fields it uses, or null when any part is outside its shape (the whole index is
 * refused, so the page never shows a link it was not checked for). Each release's file is <name>-<version>.tar.gz.
 */
export function sourceIndex(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.addons)) return null
  if (value.addons.length > MAX_ADDONS) return null
  const addons = []
  for (const addon of value.addons) {
    if (addon === null || typeof addon !== 'object' || !Array.isArray(addon.releases)) return null
    if (!NAME.test(addon.name) || !text(addon.title, 80) || !text(addon.license, 80)) return null
    if (addon.releases.length > MAX_RELEASES) return null
    const releases = []
    for (const release of addon.releases) {
      if (release === null || typeof release !== 'object') return null
      if (!VERSION.test(release.version) || release.file !== `${addon.name}-${release.version}.tar.gz`) return null
      if (!SOURCE_FILE.test(`/source/${addon.name}/${release.file}`)) return null
      if (!Number.isSafeInteger(release.bytes) || release.bytes < 0 || release.bytes > MAX_BYTES) return null
      if (!SHA256.test(release.sha256)) return null
      releases.push({ version: release.version, file: release.file, bytes: release.bytes, sha256: release.sha256 })
    }
    addons.push({ name: addon.name, title: addon.title, license: addon.license, releases })
  }
  return { addons }
}

const text = (value, max) => typeof value === 'string' && value.trim() !== '' && value.length <= max && !/[<>]/.test(value)

/**
 * The /source responses this module owns, or null for any other path (the static pages answer those). `env.SOURCE` is the
 * bucket; without it nothing is served. Archives are immutable (their names carry the version) and are cached for a year.
 */
export async function serveSource(request, env) {
  const url = new URL(request.url)
  const archive = SOURCE_FILE.exec(url.pathname)
  if (url.pathname !== '/source/index.json' && !archive) return null
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
  if (!env.SOURCE) return new Response(null, { status: 404 })

  if (archive) {
    const object = await env.SOURCE.get(`source/${archive[1]}/${archive[2]}`)
    if (!object) return new Response(null, { status: 404 })
    const headers = {
      'Content-Type': 'application/gzip',
      'Content-Length': String(object.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: object.httpEtag,
    }
    return new Response(request.method === 'HEAD' ? null : object.body, { headers })
  }

  const object = await env.SOURCE.get('source/index.json')
  if (!object) return new Response(null, { status: 404 })
  let index
  try {
    index = sourceIndex(JSON.parse(await object.text()))
  } catch {
    index = null
  }
  if (!index) return new Response(null, { status: 503 })
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
}
