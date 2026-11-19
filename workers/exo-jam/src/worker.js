/**
 * Exo Jam's relay: a Cloudflare Worker with one Durable Object per Jam. The Exo apps in a Jam listen to music together,
 * each on their own service; this passes their sealed messages in one order, answers their clock pings and keeps nothing.
 * Every payload is sealed (AES-256-GCM) with a key that lives only in the Jam's invite link after the `#`, which no browser
 * or Exo sends to a server, so the Worker sees no song, no name and no key. The Jam's id (32 lowercase hex) is derived from
 * the same secret by every member, so it is not a second secret. Nothing is written to disk, nothing is logged, and there
 * is no storage call at all: presence is the set of open sockets, and the counters live in each socket's attachment, so
 * they survive hibernation and go with the last member.
 *
 * GET /v1/<id> (WebSocket upgrade) joins a Jam. Binary frames, all integers big-endian:
 * from a client
 *   0x10 payload             a sealed op, at most 4160 bytes: sent to everyone in the Jam, the sender included
 *   0x11 t0:u48              a clock ping: the client's own time in ms
 *   0x12 to:u32 payload      a sealed message for one connection only, at most 16448 bytes (a late joiner's hand-over)
 * to a client
 *   0x01 seq:u32 ts:u48 conn:u32 payload   an op in the order this Jam took it; ts is this Worker's clock in ms then
 *   0x02 conn:u32                          that connection left
 *   0x03 conn:u32                          that connection joined
 *   0x04 t0:u48 ts:u48                     the pong: the ping's t0 and this Worker's clock when it came
 *   0x05 from:u32 payload                  a targeted message
 *   0x06 conn:u32 era:u32 seq:u32 ts:u48 n:u8 conn:u32*n   first frame: the caller's own id, the order's era and last
 *                                           seq, the clock, and the connections already here
 * Limits: 16 connections per Jam (more get 429), ops 12 in a burst then 8 per 10 s, pings 6 in a burst then 1 per 5 s,
 * targeted messages 4 in a burst then 2 per 10 s (more closes the connection, 1008), too big 1009, text or an unknown
 * frame 1003, no op for 60 minutes closes it at its next ping (1000). The era is new when a Jam starts again with nobody in it.
 */

const MAX_SOCKETS = 16
const MAX_OP = 4160
const MAX_TO = 16448
const IDLE_MS = 60 * 60 * 1000
const OP = 0x10
const PING = 0x11
const TO = 0x12
// bucket: capacity and tokens refilled per second
const OP_BUCKET = [12, 0.8]
const PING_BUCKET = [6, 0.2]
const TO_BUCKET = [4, 0.2]

export default {
  async fetch(request, env) {
    const id = /^\/v1\/([0-9a-f]{32})$/.exec(new URL(request.url).pathname)?.[1]
    if (!id) return new Response('Not found', { status: 404 })
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket only', { status: 426 })
    // Cloudflare counts this at the edge; without the binding (tests, a local run) there is no limit.
    if (env.JAM_LIMIT && !(await env.JAM_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' })).success)
      return new Response('Slow down', { status: 429 })
    return env.JAMS.get(env.JAMS.idFromName(id)).fetch(request)
  },
}

/** One Jam: its connections, through the WebSocket Hibernation API, so a quiet Jam costs nothing. */
export class Jam {
  constructor(ctx) {
    this.ctx = ctx
  }

  async fetch() {
    const sockets = this.ctx.getWebSockets()
    if (sockets.length >= MAX_SOCKETS) return new Response('Full', { status: 429 })
    const here = sockets.map(ws => ws.deserializeAttachment()).filter(Boolean)
    const taken = new Set(here.map(kept => kept.conn))
    let conn
    do conn = crypto.getRandomValues(new Uint32Array(1))[0]
    while (taken.has(conn))
    const now = Date.now()
    const order = here.length
      ? { era: here[0].era, seq: Math.max(...here.map(kept => kept.seq)), ts: Math.max(...here.map(kept => kept.ts)) }
      : { era: crypto.getRandomValues(new Uint32Array(1))[0], seq: 0, ts: 0 }
    const { 0: client, 1: server } = new WebSocketPair()
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({
      conn, ...order, last: now,
      ops: { n: OP_BUCKET[0], at: now }, pings: { n: PING_BUCKET[0], at: now }, tos: { n: TO_BUCKET[0], at: now },
    })
    const ids = here.map(kept => kept.conn)
    // The layout is 1 + 4 + 4 + 4 + 6 + 1 + 4n.
    const welcome = new Uint8Array(20 + 4 * ids.length)
    const view = new DataView(welcome.buffer)
    welcome[0] = 6
    view.setUint32(1, conn)
    view.setUint32(5, order.era)
    view.setUint32(9, order.seq)
    putU48(view, 13, Math.max(now, order.ts))
    welcome[19] = ids.length
    ids.forEach((other, i) => view.setUint32(20 + 4 * i, other))
    server.send(welcome)
    const joined = new Uint8Array(5)
    joined[0] = 3
    new DataView(joined.buffer).setUint32(1, conn)
    this.others(server, joined)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws, message) {
    if (typeof message === 'string') return this.gone(ws, 1003, 'Binary only')
    const bytes = new Uint8Array(message)
    if (bytes.length < 2) return this.gone(ws, 1009, 'Too small')
    const kept = ws.deserializeAttachment()
    if (!kept) return this.gone(ws, 1011, 'Lost')
    const now = Date.now()
    switch (bytes[0]) {
      case OP: return this.op(ws, kept, bytes, now)
      case PING: return this.ping(ws, kept, bytes, now)
      case TO: return this.to(ws, kept, bytes, now)
      default: return this.gone(ws, 1003, 'Unknown frame')
    }
  }

  op(ws, kept, bytes, now) {
    if (bytes.length - 1 > MAX_OP) return this.gone(ws, 1009, 'Too big')
    if (!take(kept.ops, OP_BUCKET, now)) return this.gone(ws, 1008, 'Too many')
    kept.last = now
    const sockets = this.ctx.getWebSockets()
    // One order for everyone: the next seq, and a clock that never steps back between two ops.
    const seq = kept.seq + 1
    const ts = Math.max(now, kept.ts)
    const out = new Uint8Array(15 + bytes.length - 1)
    const view = new DataView(out.buffer)
    out[0] = 1
    view.setUint32(1, seq)
    putU48(view, 5, ts)
    view.setUint32(11, kept.conn)
    out.set(bytes.subarray(1), 15)
    for (const other of sockets) {
      const theirs = other === ws ? kept : other.deserializeAttachment()
      if (!theirs) continue
      theirs.seq = seq
      theirs.ts = ts
      other.serializeAttachment(theirs)
      try { other.send(out) } catch { /* closing; its own close handler tells the rest */ }
    }
  }

  ping(ws, kept, bytes, now) {
    if (bytes.length !== 7) return this.gone(ws, 1009, 'Bad ping')
    if (!take(kept.pings, PING_BUCKET, now)) return this.gone(ws, 1008, 'Too many')
    // The clock is read first: a message is I/O, so Date.now() has moved to its arrival.
    if (now - kept.last > IDLE_MS) return this.gone(ws, 1000, 'Idle')
    ws.serializeAttachment(kept)
    const out = new Uint8Array(13)
    out[0] = 4
    out.set(bytes.subarray(1, 7), 1)
    putU48(new DataView(out.buffer), 7, now)
    ws.send(out)
  }

  to(ws, kept, bytes, now) {
    if (bytes.length < 6 || bytes.length - 5 > MAX_TO) return this.gone(ws, 1009, 'Too big')
    if (!take(kept.tos, TO_BUCKET, now)) return this.gone(ws, 1008, 'Too many')
    ws.serializeAttachment(kept)
    const target = new DataView(bytes.buffer, bytes.byteOffset).getUint32(1)
    const out = new Uint8Array(5 + bytes.length - 5)
    out[0] = 5
    new DataView(out.buffer).setUint32(1, kept.conn)
    out.set(bytes.subarray(5), 5)
    for (const other of this.ctx.getWebSockets())
      if (other !== ws && other.deserializeAttachment()?.conn === target) try { other.send(out) } catch { /* closing */ }
  }

  async webSocketClose(ws) {
    this.gone(ws)
  }

  async webSocketError(ws) {
    this.gone(ws)
  }

  /** The connection is done (it closed, or the Worker closes it with code): the others are told. */
  gone(ws, code = 1000, reason = 'Bye') {
    const kept = ws.deserializeAttachment()
    if (kept) {
      const out = new Uint8Array(5)
      out[0] = 2
      new DataView(out.buffer).setUint32(1, kept.conn)
      this.others(ws, out)
    }
    try { ws.close(code, reason) } catch { /* already closed */ }
  }

  others(ws, data) {
    for (const other of this.ctx.getWebSockets())
      if (other !== ws) try { other.send(data) } catch { /* closing; its own close handler tells the rest */ }
  }
}

/** Takes one token from a bucket (capacity, per second) kept in a socket's attachment; false when it is empty. */
function take(bucket, [capacity, rate], now) {
  bucket.n = Math.min(capacity, bucket.n + (now - bucket.at) / 1000 * rate)
  bucket.at = now
  if (bucket.n < 1) return false
  bucket.n -= 1
  return true
}

function putU48(view, at, value) {
  view.setUint16(at, Math.floor(value / 2 ** 32))
  view.setUint32(at + 2, value % 2 ** 32)
}
