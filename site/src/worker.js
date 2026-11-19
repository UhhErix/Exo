import { SECURITY_HEADERS } from './headers.js'
import { RELEASES, downloadUrl } from './releases.js'

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname
    const route = /^\/(download\/([^/]+)\/?|api\/([^/]+)\.json)$/.exec(path)
    let response
    if (route) {
      const app = route[2] || route[3]
      if (!Object.hasOwn(RELEASES, app)) response = new Response('Unknown app', { status: 404 })
      else if (!['GET', 'HEAD'].includes(request.method)) response = new Response('GET only', { status: 405, headers: { allow: 'GET, HEAD' } })
      else if (route[2]) response = new Response(null, { status: 302, headers: { location: downloadUrl(app), 'cache-control': 'no-store' } })
      else response = new Response(request.method === 'HEAD' ? null : JSON.stringify({ app, ...RELEASES[app] }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' } })
    } else {
      const changelog = /^\/(launcher|cinema|browser)\/changelog$/.exec(path)
      if (changelog) {
        if (!['GET', 'HEAD'].includes(request.method)) return new Response('GET only', { status: 405, headers: { allow: 'GET, HEAD' } })
        const { changelogResponse } = await import('./changelog-edge.js')
        response = await changelogResponse(changelog[1], request, env, ctx)
      } else response = await env.ASSETS.fetch(request)
    }
    const out = new Response(response.body, response)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value)
    out.headers.delete('set-cookie')
    return out
  },
}
