import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import worker from './src/worker.js'
const root = resolve('public')
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.webm': 'video/webm', '.mp4': 'video/mp4' }
const env = { ASSETS: { async fetch(request) {
  const path = decodeURIComponent(new URL(request.url).pathname)
  let file = resolve(root, '.' + (path === '/' ? '/index.html' : path))
  if (file !== root && !file.startsWith(root + sep)) return new Response('Forbidden', { status: 403 })
  let status = 200
  try { if (!(await stat(file)).isFile()) throw new Error() } catch {
    if (!extname(file)) file += '.html'
    try { await stat(file) } catch { file = resolve(root, '404.html'); status = 404 }
  }
  return new Response(request.method === 'HEAD' ? null : await readFile(file), { status, headers: { 'content-type': types[extname(file)] || 'application/octet-stream' } })
} } }
createServer(async (req, res) => {
  try {
    const request = new Request('http://127.0.0.1:8787' + req.url, { method: req.method })
    const response = req.url.split('?')[0].endsWith('/changelog')
      ? await env.ASSETS.fetch(request)
      : await worker.fetch(request, env, { waitUntil: () => {} })
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch { res.writeHead(500); res.end('Preview error') }
}).listen(8787, '127.0.0.1', () => console.log('Exo preview ready: http://127.0.0.1:8787'))
