/**
 * Exo Jam's room server: a Cloudflare Worker that makes a room (POST /v1/jams) and a Durable Object per room code
 * (JamRoom) that holds it: its members, the host's playback and the queue. The protocol is in README.md.
 *
 * Nothing lives only in memory. A room is in Durable Object storage and each socket's member is in that socket's own
 * attachment, so the object can be evicted between any two messages and the room carries on. The host's token is never
 * stored, only its SHA-256 hash. No logs are written, and no IP address is read or kept.
 *
 * How it could fail: a guest changes the playback, the queue or the members (the host check is missed); two sockets
 * share one member id; the host seat is kept by a socket that has gone (the room never ends) or lost to one that is
 * still there; a room outlives its 10-minute claim, its 90-second host gap or its 12 idle hours, or ends while the host
 * is in it; a late joiner misses the playback or the queue; a limit is passed (8 KiB frames, 32 members, 100 queue
 * items, 10 per member, 30 messages per 10 s); a bad frame ends the whole room instead of its one socket; a song
 * carries fields it was not asked to keep; the token reaches storage, a log or another room.
 */
import { DurableObject } from 'cloudflare:workers'

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{8}$/
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/
const HASH_RE = /^[0-9a-f]{64}$/
const MEMBER_RE = /^[0-9a-f]{16}$/
const ITEM_RE = /^[0-9a-f]{8}$/
const ISRC_RE = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/
const SERVICES = ['spotify', 'apple', 'youtube']
const STATUSES = ['playing', 'paused', 'none']
const MAX_FRAME = 8192
const MAX_MEMBERS = 32
const MAX_QUEUE = 100
const MAX_PER_MEMBER = 10
const MAX_MESSAGES = 30
const WINDOW_MS = 10_000
const CLAIM_MS = 10 * 60_000
const AWAY_MS = 90_000
const IDLE_MS = 12 * 60 * 60_000
const SEEN_EVERY_MS = 60_000
const MAX_DURATION_MS = 86_400_000
const MAX_POSITION_MS = 86_400_000
const MAX_SEQ = Number.MAX_SAFE_INTEGER
const CLOSE_BAD_MESSAGE = 4000
const CLOSE_NO_HELLO = 4001
const HELLO_MS = 10_000
const MAX_WAITING = 16
const closeQuietly = (ws, code, reason) => { try { ws.close(code, reason) } catch { /* already closed */ } }
const CLOSE_TAKEN = 4002
const CLOSE_BAD_TOKEN = 4003
const CLOSE_REPLACED = 4005
const CLOSE_FULL = 4006
const CLOSE_REMOVED = 4007
const PONG = JSON.stringify({ t: 'pong' })

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/v1/jams') return request.method === 'POST' ? createJam(request, env) : notFound()
    const path = /^\/v1\/jams\/([^/]+)\/ws$/.exec(url.pathname)
    if (!path || request.method !== 'GET') return notFound()
    const code = normaliseCode(path[1])
    if (!code) return notFound()
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket only', { status: 426 })
    // A new request carries only the upgrade on, so the room never sees the client's headers or address.
    return env.JAM_ROOMS.get(env.JAM_ROOMS.idFromName(code)).fetch(new Request('https://jam.internal/join', { headers: { Upgrade: 'websocket' } }))
  },
}

/** One room: its state in storage, its members in socket attachments. Every handler starts from storage, not memory. */
export class JamRoom extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname === '/create') return this.create(request)
    if (url.pathname === '/join' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') return this.join()
    return notFound()
  }

  /** The Worker's first call: the room with a hash of its host token, cleared if no host joins in time. */
  async create(request) {
    const body = await request.json().catch(() => null)
    if (!isObject(body) || typeof body.code !== 'string' || !CODE_RE.test(body.code) || typeof body.tokenHash !== 'string' || !HASH_RE.test(body.tokenHash)) {
      return new Response('Bad request', { status: 400 })
    }
    if (await this.ctx.storage.get('room')) return new Response('Taken', { status: 409 })
    const now = Date.now()
    const room = { code: body.code, tokenHash: body.tokenHash, created: now, host: null, hostName: '', hostAway: false, awayAt: 0, seen: now }
    await this.ctx.storage.put('room', room)
    await this.ctx.storage.setAlarm(deadline(room))
    return new Response(null, { status: 201 })
  }

  /** A socket for the room. Nothing is said to it until its hello. */
  async join() {
    if (!(await this.loadRoom())) return new Response('No such room', { status: 404 })
    // A socket that never says hello is closed by the next join past HELLO_MS, and no more than MAX_WAITING wait at once.
    const now = Date.now()
    const waiting = this.ctx.getWebSockets().filter(ws => att(ws).m === null)
    for (const ws of waiting) if (now - (att(ws).at ?? 0) > HELLO_MS) closeQuietly(ws, CLOSE_NO_HELLO, 'no-hello')
    if (waiting.filter(ws => now - (att(ws).at ?? 0) <= HELLO_MS).length >= MAX_WAITING) return new Response('Busy', { status: 429 })
    const { 0: client, 1: server } = new WebSocketPair()
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ m: null, n: '', r: [], at: now })
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws, message) {
    const room = await this.loadRoom()
    if (!room) return
    if (typeof message !== 'string' || message.length > MAX_FRAME || new TextEncoder().encode(message).byteLength > MAX_FRAME) {
      return this.fail(ws, 'bad-message', CLOSE_BAD_MESSAGE, room)
    }
    let msg
    try {
      msg = JSON.parse(message)
    } catch {
      return this.fail(ws, 'bad-message', CLOSE_BAD_MESSAGE, room)
    }
    if (!isObject(msg) || typeof msg.t !== 'string') return error(ws, 'bad-message')
    const a = att(ws)
    if (a.m === null) {
      if (msg.t !== 'hello') return this.fail(ws, 'no-hello', CLOSE_NO_HELLO, room)
      return this.hello(ws, msg)
    }
    if (msg.t === 'ping') return send(ws, PONG)
    const now = Date.now()
    const recent = a.r.filter(at => now - at < WINDOW_MS)
    if (recent.length >= MAX_MESSAGES) return error(ws, 'rate-limited')
    recent.push(now)
    ws.serializeAttachment({ ...a, r: recent })
    if (now - room.seen >= SEEN_EVERY_MS) {
      room.seen = now
      await this.ctx.storage.put('room', room)
    }
    switch (msg.t) {
      case 'playback': return this.playback(ws, msg, room)
      case 'queue.add': return this.queueAdd(ws, msg)
      case 'queue.remove': return this.queueRemove(ws, msg, room)
      case 'member.remove': return this.memberRemove(ws, msg, room)
      case 'end': return this.hostEnd(ws, room)
      case 'leave': return this.leave(ws, room)
      default: return error(ws, 'bad-message')
    }
  }

  async webSocketClose(ws) {
    if (att(ws).m === null) return
    const room = await this.loadRoom()
    if (room) await this.leaveRoom(ws, room)
  }

  async webSocketError(ws) {
    return this.webSocketClose(ws)
  }

  /** The alarm is the room's next deadline: past it the room ends, before it the alarm is set again for it. */
  async alarm() {
    const room = await this.loadRoom()
    if (room) await this.ctx.storage.setAlarm(deadline(room))
  }

  /**
   * The stored room, or null. A room past its deadline (or with no room at all) ends here, and endRoom tells every
   * socket, so no event ever acts on a room that is over.
   */
  async loadRoom() {
    const room = await this.ctx.storage.get('room')
    const reason = room ? dueReason(room, Date.now()) : 'expired'
    if (room && !reason) return room
    await this.endRoom(reason)
    return null
  }

  /** The first message. The hash is awaited before the room is read, so the room read here is the current one. */
  async hello(ws, msg) {
    const { member } = msg
    if (typeof member !== 'string' || !MEMBER_RE.test(member)) return this.fail(ws, 'bad-message', CLOSE_BAD_MESSAGE)
    const name = cleanText(msg.name, 40)
    if (!name) return this.fail(ws, 'bad-name', CLOSE_BAD_MESSAGE)
    const token = msg.token ?? null
    if (token !== null && (typeof token !== 'string' || !TOKEN_RE.test(token))) return this.fail(ws, 'bad-token', CLOSE_BAD_TOKEN)
    const hash = token === null ? null : await sha256Hex(token)
    const room = await this.loadRoom()
    if (!room) return

    const sockets = this.ctx.getWebSockets()
    const isHost = hash !== null && sameText(hash, room.tokenHash)
    const taken = sockets.some(other => other !== ws && att(other).m === member) || (room.hostAway && room.host === member && !isHost)
    if (taken) return this.fail(ws, 'taken', CLOSE_TAKEN)
    if (hash !== null && !isHost) return this.fail(ws, 'bad-token', CLOSE_BAD_TOKEN)
    // A host taking the seat from a live host socket is a replacement, and does not add a member.
    const seat = isHost && room.host !== null ? sockets.find(other => other !== ws && att(other).m === room.host) : undefined
    const others = this.roster(room, sockets).filter(m => m.id !== member).length
    if (!seat && others >= MAX_MEMBERS) return this.fail(ws, 'full', CLOSE_FULL)

    const now = Date.now()
    if (isHost) {
      room.host = member
      room.hostName = name
      room.hostAway = false
      room.awayAt = 0
    }
    room.seen = now
    await this.ctx.storage.put('room', room)
    if (isHost) await this.ctx.storage.setAlarm(deadline(room))
    if (seat) {
      seat.serializeAttachment({ m: null, n: '', r: [] })
      error(seat, 'replaced')
      hang(seat, CLOSE_REPLACED, 'replaced')
    }
    ws.serializeAttachment({ m: member, n: name, r: [now] })

    const stored = await this.ctx.storage.get(['playback', 'queue'])
    const playback = stored.get('playback') ?? null
    const members = this.roster(room, this.ctx.getWebSockets())
    send(ws, JSON.stringify({
      t: 'welcome',
      code: room.code,
      you: member,
      host: room.host,
      hostAway: room.hostAway,
      members,
      playback: playback && { song: playback.song, status: playback.status, positionMs: playback.positionMs, seq: playback.seq, ageMs: Math.max(0, now - playback.at) },
      queue: stored.get('queue') ?? [],
    }))
    this.broadcast(this.membersText(room), other => other === ws)
  }

  /** The host's playback: kept for late joiners, and sent at once to every guest. */
  async playback(ws, msg, room) {
    if (att(ws).m !== room.host) return error(ws, 'not-host')
    if (!STATUSES.includes(msg.status) || !isSafeInt(msg.positionMs, 0, MAX_POSITION_MS) || !isSafeInt(msg.seq, 0, MAX_SEQ)) {
      return error(ws, 'bad-message')
    }
    let song = null
    if (msg.song !== null) {
      song = normaliseSong(msg.song)
      if (!song) return error(ws, 'bad-song')
    }
    const playback = { song, status: msg.status, positionMs: msg.positionMs, seq: msg.seq, at: Date.now() }
    await this.ctx.storage.put('playback', playback)
    const { status, positionMs, seq } = playback
    this.broadcast(JSON.stringify({ t: 'playback', song, status, positionMs, seq, ageMs: 0 }), (other, a) => a.m === room.host)
  }

  /** A member adds a song to the end of the queue. */
  async queueAdd(ws, msg) {
    const song = normaliseSong(msg.song)
    if (!song) return error(ws, 'bad-song')
    const a = att(ws)
    const queue = (await this.ctx.storage.get('queue')) ?? []
    if (queue.length >= MAX_QUEUE || queue.filter(item => item.by === a.m).length >= MAX_PER_MEMBER) return error(ws, 'full')
    let id
    do id = randomHex(4)
    while (queue.some(item => item.id === id))
    queue.push({ id, song, by: a.m, byName: a.n })
    await this.ctx.storage.put('queue', queue)
    this.broadcast(JSON.stringify({ t: 'queue', queue }))
  }

  async queueRemove(ws, msg, room) {
    if (att(ws).m !== room.host) return error(ws, 'not-host')
    if (typeof msg.id !== 'string' || !ITEM_RE.test(msg.id)) return error(ws, 'bad-message')
    const queue = (await this.ctx.storage.get('queue')) ?? []
    const left = queue.filter(item => item.id !== msg.id)
    if (left.length === queue.length) return error(ws, 'no-such-item')
    await this.ctx.storage.put('queue', left)
    this.broadcast(JSON.stringify({ t: 'queue', queue: left }))
  }

  async memberRemove(ws, msg, room) {
    if (att(ws).m !== room.host) return error(ws, 'not-host')
    if (typeof msg.member !== 'string' || !MEMBER_RE.test(msg.member)) return error(ws, 'bad-message')
    const target = msg.member === room.host ? undefined : this.ctx.getWebSockets().find(other => att(other).m === msg.member)
    if (!target) return error(ws, 'no-such-member')
    target.serializeAttachment({ m: null, n: '', r: [] })
    send(target, JSON.stringify({ t: 'removed' }))
    hang(target, CLOSE_REMOVED, 'removed')
    this.broadcast(this.membersText(room))
  }

  async hostEnd(ws, room) {
    if (att(ws).m !== room.host) return error(ws, 'not-host')
    await this.endRoom('host-ended')
  }

  async leave(ws, room) {
    await this.leaveRoom(ws, room)
    hang(ws, 1000, 'left')
  }

  /** A member's socket is gone (closed, left or failed). It is detached first, so the room hears of it once. */
  async leaveRoom(ws, room) {
    const a = att(ws)
    if (a.m === null) return
    ws.serializeAttachment({ m: null, n: '', r: [] })
    if (a.m === room.host) {
      room.hostAway = true
      room.awayAt = Date.now()
      await this.ctx.storage.put('room', room)
      await this.ctx.storage.setAlarm(deadline(room))
    }
    this.broadcast(this.membersText(room))
  }

  /** A socket that broke a rule: its error is sent, its member leaves, and it is closed with the code. */
  async fail(ws, code, closeCode, room) {
    error(ws, code)
    if (room) await this.leaveRoom(ws, room)
    hang(ws, closeCode, code)
  }

  /** The room is over: every socket is told why and closed, and the room is cleared from storage. */
  async endRoom(reason) {
    const text = JSON.stringify({ t: 'ended', reason })
    for (const ws of this.ctx.getWebSockets()) {
      ws.serializeAttachment({ m: null, n: '', r: [] })
      send(ws, text)
      hang(ws, 1000, 'ended')
    }
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
  }

  /** The members: each joined socket, and the host while it is away. The host comes first. */
  roster(room, sockets) {
    const members = []
    for (const ws of sockets) {
      const a = att(ws)
      if (a.m !== null) members.push({ id: a.m, name: a.n, host: a.m === room.host })
    }
    if (room.hostAway) members.push({ id: room.host, name: room.hostName, host: true })
    return members.sort((x, y) => Number(y.host) - Number(x.host))
  }

  membersText(room) {
    return JSON.stringify({ t: 'members', members: this.roster(room, this.ctx.getWebSockets()), host: room.host, hostAway: room.hostAway })
  }

  /** Sends text to every joined socket that skip(socket, attachment) does not pick out. */
  broadcast(text, skip = () => false) {
    for (const ws of this.ctx.getWebSockets()) {
      const a = att(ws)
      if (a.m !== null && !skip(ws, a)) send(ws, text)
    }
  }
}

/** The Worker's room code: typed in any case, with the Crockford look-alikes I and L read as 1 and O as 0. */
function normaliseCode(text) {
  const code = text.toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0')
  return CODE_RE.test(code) ? code : null
}

async function createJam(request, env) {
  // The name is checked and then dropped: no message carries it, so nothing keeps it.
  if (!(await readName(request))) return new Response('Bad request', { status: 400 })
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    const token = randomToken()
    const made = await env.JAM_ROOMS.get(env.JAM_ROOMS.idFromName(code)).fetch('https://jam.internal/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, tokenHash: await sha256Hex(token) }),
    })
    if (made.status === 201) return Response.json({ code, token }, { status: 201, headers: { 'cache-control': 'no-store' } })
    if (made.status !== 409) break
  }
  return new Response('Try again', { status: 503 })
}

/** The jam name from the body: 1 to 40 characters once control characters and the ends are cleaned, or null. */
async function readName(request) {
  if (Number(request.headers.get('content-length') ?? 0) > 1024) return null
  const text = await request.text()
  if (text.length > 1024) return null
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  return isObject(body) ? cleanText(body.name, 40) : null
}

/** A song as the room keeps it: exactly the fields the protocol names, each checked, or null when one is wrong. */
function normaliseSong(input) {
  if (!isObject(input)) return null
  const title = cleanText(input.title, 200)
  if (title === null || !Array.isArray(input.artists) || input.artists.length > 6) return null
  const artists = input.artists.map(artist => cleanText(artist, 100))
  if (artists.includes(null)) return null
  const album = present(input.album) ? cleanText(input.album, 200, 0) : ''
  if (album === null) return null
  const durationMs = present(input.durationMs) ? input.durationMs : null
  if (durationMs !== null && !isSafeInt(durationMs, 1000, MAX_DURATION_MS)) return null
  const isrc = present(input.isrc) ? input.isrc : null
  if (isrc !== null && (typeof isrc !== 'string' || !ISRC_RE.test(isrc))) return null
  const service = present(input.service) ? input.service : null
  if (service !== null && !SERVICES.includes(service)) return null
  const uri = present(input.uri) ? input.uri : null
  if (uri !== null && (typeof uri !== 'string' || uri.length === 0 || [...uri].length > 160 || /[\s\p{Cc}]/u.test(uri))) return null
  return { title, artists, album: album || null, durationMs, isrc, service, uri }
}

/** Text as the protocol takes it: control characters removed, trimmed, and min to max characters, or null. */
function cleanText(value, max, min = 1) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\p{Cc}/gu, '').trim()
  const length = [...text].length
  return length >= min && length <= max ? text : null
}

/** Why the room is over by now (the deadline has passed), or null. */
function dueReason(room, now) {
  if (now < deadline(room)) return null
  return room.hostAway ? 'host-away' : 'expired'
}

/** When the room's next deadline is: the 10-minute claim, the 90 seconds of a host away, or the 12 idle hours. */
function deadline(room) {
  if (room.host === null) return room.created + CLAIM_MS
  if (room.hostAway) return room.awayAt + AWAY_MS
  return room.seen + IDLE_MS
}

/** A socket's attachment: its member id (null until hello), its display name and the times of its recent messages. */
function att(ws) {
  return ws.deserializeAttachment() ?? { m: null, n: '', r: [] }
}

/** One frame to one socket. A socket that is already closing cannot take it, and its own close tells the room. */
function send(ws, text) {
  try {
    ws.send(text)
  } catch {
    /* closing */
  }
}

function error(ws, code) {
  send(ws, JSON.stringify({ t: 'error', code }))
}

function hang(ws, code, reason) {
  try {
    ws.close(code, reason)
  } catch {
    /* already closed */
  }
}

function notFound() {
  return new Response('Not found', { status: 404 })
}

function present(value) {
  return value !== undefined && value !== null
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeInt(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max
}

/** Comparison of two hex strings that takes the same time whatever the first difference is. */
function sameText(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function randomCode() {
  // 256 is a multiple of 32, so a byte's low five bits pick each character equally often.
  return [...crypto.getRandomValues(new Uint8Array(8))].map(byte => CODE_ALPHABET[byte & 31]).join('')
}

function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)))
}

function randomHex(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function base64url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
