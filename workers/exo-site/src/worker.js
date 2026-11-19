import site from '../../../site/src/worker.js'
import { serveSource } from './source.js'
import { SECURITY_HEADERS } from '../../../site/src/headers.js'

export default {
  async fetch(request, env, ctx) {
    const source = await serveSource(request, env)
    if (!source) return site.fetch(request, env, ctx)
    const out = new Response(source.body, source)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value)
    return out
  },
}
