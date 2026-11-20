// The Discord Gateway connection as a state machine: HELLO, heartbeats with an ACK check, IDENTIFY or RESUME, reconnects with
// backoff, and the close codes that stop it. It does no I/O of its own: the socket, the clock, the timers, the random source
// and the storage come in as parameters, so test/gateway-link.test.mjs drives it with a fake socket and fake timers.
//
// How it could fail: a dead socket is never noticed (no ACK, or no frame for 90 s); a reconnect resumes a session that is
// gone, or resumes without its sequence number; two sockets run at once (a stale socket's frames are ignored); a stopping
// close is retried in a loop; the token reaches a log.

export const OP = Object.freeze({
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
});

export const INTENTS = Object.freeze({ GUILDS: 1 << 0, GUILD_MESSAGES: 1 << 9, MESSAGE_CONTENT: 1 << 15 });
export const WANTED_INTENTS = INTENTS.GUILDS | INTENTS.GUILD_MESSAGES | INTENTS.MESSAGE_CONTENT; // 33281

// Activity type 3 is "Watching".
export const PRESENCE = Object.freeze({ since: null, status: 'online', afk: false, activities: [{ name: '#help', type: 3 }] });
const IDENTIFY_PROPERTIES = Object.freeze({ os: 'linux', browser: 'exo-bot', device: 'exo-bot' });

// Close codes that stop the bot. Discord's docs: a bad token, a wrong shard or API version, or an intent that is not allowed.
export const STOP_REASONS = Object.freeze({
  4004: 'authentication failed: the bot token is wrong or was reset',
  4010: 'invalid shard',
  4011: 'sharding required',
  4012: 'invalid API version',
  4013: 'invalid intents',
  4014: 'disallowed intents: turn on the Message Content intent in the developer portal',
});
// Discord's docs: after these the old session cannot be resumed, so the next connect identifies again.
const NEW_SESSION = new Set([4006, 4007, 4009]);

export const BACKOFF = Object.freeze({ baseMs: 1000, maxMs: 60_000, jitterMs: 500 });
export const STOP_RETRY_MS = 3_600_000;
const CONNECT_STALE_MS = 30_000;
const SILENT_MS = 90_000;
const DEFAULT_HEARTBEAT_MS = 41_250;
const GATEWAY_QUERY = 'v=10&encoding=json';

const silentLimit = (heartbeatMs) => Math.max(SILENT_MS, 2 * heartbeatMs);
const globalTimers = () => ({
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id),
});

export class GatewayLink {
  constructor({
    token,
    openSocket,
    getGatewayUrl,
    store,
    clock = () => Date.now(),
    timers = globalTimers(),
    random = Math.random,
    log = () => {},
    onDispatch = () => {},
  }) {
    Object.assign(this, { token, openSocket, getGatewayUrl, store, clock, timers, random, log, onDispatch });
    this.state = 'idle'; // idle | connecting | open
    this.conn = null; // the current attempt: { socket, heartbeat, ackPending, attempt }
    this.attempt = 0;
    this.seq = null;
    this.sessionId = null;
    this.resumeUrl = null;
    this.botId = null;
    this.attempts = 0; // reconnects since the last READY or RESUMED; drives the backoff
    this.reconnectTimer = null;
    this.heartbeatMs = DEFAULT_HEARTBEAT_MS;
    this.lastFrameAt = 0;
    this.connectingSince = 0;
    this.stopped = null; // { code, reason, retryAt }
  }

  /** Loads the saved session (seq, session id, resume URL, bot id, a stop) from storage. */
  async restore() {
    const saved = await this.store.load();
    if (!saved) return;
    this.seq = saved.seq ?? null;
    this.sessionId = saved.sessionId ?? null;
    this.resumeUrl = saved.resumeUrl ?? null;
    this.botId = saved.botId ?? null;
    this.stopped = saved.stopped ?? null;
  }

  /** Called by the cron and the alarm. Connects an idle link, drops a silent socket, and says what state it is in. */
  async ensure() {
    const now = this.clock();
    if (this.stopped) {
      if (now < this.stopped.retryAt) return 'stopped';
      this.stopped = null;
      this.persist();
    }
    if (this.state === 'connecting' && now - this.connectingSince < CONNECT_STALE_MS) return 'connecting';
    if (this.state === 'open') {
      if (now - this.lastFrameAt < silentLimit(this.heartbeatMs)) return 'open';
      this.log('gateway silent, reconnecting');
      this.dropConnection(this.conn, 4000, 'silent');
      return 'reconnecting';
    }
    if (this.reconnectTimer !== null) return 'reconnecting';
    await this.connect();
    return this.state;
  }

  async connect() {
    this.clearReconnect();
    const conn = { socket: null, heartbeat: null, ackPending: false, attempt: ++this.attempt };
    this.conn = conn;
    this.state = 'connecting';
    this.connectingSince = this.clock();
    let base;
    try {
      base = this.sessionId && this.resumeUrl ? this.resumeUrl : await this.getGatewayUrl();
    } catch (error) {
      return this.failConnect(conn, error);
    }
    let socket;
    try {
      socket = await this.openSocket(gatewayUrl(base), {
        message: (text) => this.onFrame(conn, text),
        close: (code) => this.onClose(conn, code),
      });
    } catch (error) {
      return this.failConnect(conn, error);
    }
    if (this.conn !== conn) {
      socket.close(4000, 'superseded');
      return;
    }
    conn.socket = socket;
    this.state = 'open';
    this.lastFrameAt = this.clock();
  }

  failConnect(conn, error) {
    if (this.conn !== conn) return;
    this.conn = null;
    this.state = 'idle';
    if (error?.status === 401) return this.stop(401, 'Discord refused the bot token');
    this.log('gateway connect failed', { error: error?.name ?? 'Error', status: error?.status ?? null });
    this.scheduleReconnect();
  }

  onFrame(conn, text) {
    if (this.conn !== conn) return;
    this.lastFrameAt = this.clock();
    let frame;
    try {
      frame = JSON.parse(text);
    } catch {
      return;
    }
    switch (frame.op) {
      case OP.HELLO:
        return this.onHello(conn, frame.d);
      case OP.HEARTBEAT_ACK:
        conn.ackPending = false;
        return;
      case OP.HEARTBEAT:
        return this.send(conn, { op: OP.HEARTBEAT, d: this.seq });
      case OP.DISPATCH:
        return this.onDispatch_(frame);
      case OP.RECONNECT:
        return this.dropConnection(conn, 4000, 'server asked to reconnect');
      case OP.INVALID_SESSION:
        if (frame.d !== true) {
          this.sessionId = null;
          this.seq = null;
        }
        // Discord asks for a pause of 1 to 5 seconds before the next connect.
        return this.dropConnection(conn, 4000, 'invalid session', 1000 + this.random() * 4000);
      default:
        return;
    }
  }

  onHello(conn, d) {
    this.heartbeatMs = d.heartbeat_interval;
    this.clearHeartbeat(conn);
    // The first heartbeat comes after a random share of the interval, then one every interval (beat).
    conn.heartbeat = this.timers.setTimeout(() => this.beat(conn), this.heartbeatMs * this.random());
    if (this.sessionId && this.seq !== null) {
      this.send(conn, { op: OP.RESUME, d: { token: this.token, session_id: this.sessionId, seq: this.seq } });
    } else {
      this.send(conn, { op: OP.IDENTIFY, d: { token: this.token, intents: WANTED_INTENTS, properties: IDENTIFY_PROPERTIES, presence: PRESENCE } });
    }
  }

  /** One heartbeat. If the last one was never acknowledged the socket is a zombie: drop it and resume on a new one. */
  beat(conn) {
    if (this.conn !== conn) return;
    if (conn.ackPending) {
      this.log('no heartbeat ACK, reconnecting');
      return this.dropConnection(conn, 4000, 'no heartbeat ACK');
    }
    conn.ackPending = true;
    this.send(conn, { op: OP.HEARTBEAT, d: this.seq });
    this.persist();
    conn.heartbeat = this.timers.setTimeout(() => this.beat(conn), this.heartbeatMs);
  }

  onDispatch_(frame) {
    if (typeof frame.s === 'number') this.seq = frame.s;
    if (frame.t === 'READY') {
      this.sessionId = frame.d.session_id;
      this.resumeUrl = frame.d.resume_gateway_url;
      this.botId = frame.d.user?.id ?? this.botId;
      this.attempts = 0;
      this.log('gateway ready');
      this.persist();
    } else if (frame.t === 'RESUMED') {
      this.attempts = 0;
      this.log('gateway resumed');
    }
    this.onDispatch(frame.t, frame.d);
  }

  onClose(conn, code) {
    if (this.conn !== conn) return;
    this.clearHeartbeat(conn);
    this.conn = null;
    this.state = 'idle';
    if (STOP_REASONS[code]) return this.stop(code, STOP_REASONS[code]);
    if (NEW_SESSION.has(code)) {
      this.sessionId = null;
      this.seq = null;
    }
    this.log('gateway closed', { code });
    this.persist();
    this.scheduleReconnect();
  }

  /** Closes our own socket and reconnects. The socket's later close event is ignored: this.conn no longer points at it. */
  dropConnection(conn, code, reason, delayMs) {
    if (!conn || this.conn !== conn) return;
    this.clearHeartbeat(conn);
    this.conn = null;
    this.state = 'idle';
    this.log('gateway dropping socket', { code, reason });
    try {
      conn.socket?.close(code, reason);
    } catch {
      // Already closed.
    }
    this.scheduleReconnect(delayMs);
  }

  scheduleReconnect(delayMs) {
    if (this.reconnectTimer !== null) return;
    const delay = delayMs ?? this.backoffMs();
    if (delayMs === undefined) this.attempts += 1;
    this.reconnectTimer = this.timers.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => this.log('gateway connect crashed', { error: error?.name ?? 'Error' }));
    }, delay);
  }

  backoffMs() {
    return Math.min(BACKOFF.maxMs, BACKOFF.baseMs * 2 ** this.attempts) + Math.floor(this.random() * BACKOFF.jitterMs);
  }

  /** The bot stops for these close codes and says why. It tries once more after an hour, so a fixed portal setting is picked up. */
  stop(code, reason) {
    this.stopped = { code, reason, retryAt: this.clock() + STOP_RETRY_MS };
    this.log('gateway stopped', { code, reason, retryInMinutes: STOP_RETRY_MS / 60_000 });
    this.persist();
  }

  send(conn, payload) {
    conn.socket?.send(JSON.stringify(payload));
  }

  clearHeartbeat(conn) {
    if (conn?.heartbeat != null) this.timers.clearTimeout(conn.heartbeat);
    if (conn) conn.heartbeat = null;
  }

  clearReconnect() {
    if (this.reconnectTimer !== null) this.timers.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  persist() {
    try {
      Promise.resolve(
        this.store.save({ seq: this.seq, sessionId: this.sessionId, resumeUrl: this.resumeUrl, botId: this.botId, stopped: this.stopped }),
      ).catch((error) => this.log('gateway save failed', { error: error?.name ?? 'Error' }));
    } catch (error) {
      this.log('gateway save failed', { error: error?.name ?? 'Error' });
    }
  }
}

/** The Gateway address as the socket needs it: https (for fetch with an Upgrade header), path "/", v=10 and JSON encoding. */
export function gatewayUrl(base) {
  const url = new URL(base);
  url.protocol = 'https:';
  url.pathname = '/';
  url.search = GATEWAY_QUERY;
  return url.href;
}
