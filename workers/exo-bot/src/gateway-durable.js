// The Gateway Durable Object's logic: one outbound WebSocket to Discord, kept up by the cron (router.js) and the alarm (every
// 60 s). The connection state machine is in gateway-link.js; this file connects it to the object's storage, the WebSocket,
// the REST calls and the message handler. It imports nothing from 'cloudflare:workers', so the tests load it directly.
//
// How the connection stays up. An outbound WebSocket keeps the object in memory for at most 15 minutes per operation
// (Cloudflare's changelog of 2026-06-19), and an idle object can be evicted after that; eviction drops the socket. The next
// cron run (within a minute) or alarm wakes the object, and the saved session resumes (RESUME), so events missed in between
// are replayed while Discord still holds the session (a few minutes). A socket with no frame for 90 s is dropped and
// reconnected by ensure().
//
// How it could fail: the saved session is lost (the next connect identifies again, and the set of #help threads is
// rebuilt from GUILD_CREATE on that identify only); two objects connect (there is one, named "main"); a stop is retried
// in a loop (once an hour at most); a message is answered twice after a replay (the in-memory set of recent message ids
// stops repeats within one object's life; a rate limit of one per 10 seconds covers the rest).
import { CHANNELS, MODEL } from './config.js';
import { routeEvent } from './dispatch.js';
import { createRest } from './discord.js';
import { GatewayLink } from './gateway-link.js';
import { createHelp } from './help.js';
import { Limits } from './limits.js';
import { ChatMemory } from './memory.js';

export const ALARM_MS = 60_000;
const THREAD_CAP = 500;
const SEEN_CAP = 200;
const defaultLog = (event, fields = {}) => console.log(JSON.stringify({ bot: event, ...fields }));

export class GatewayDurable {
  constructor(
    ctx,
    env,
    {
      knowledge = '',
      fetchImpl = (...args) => globalThis.fetch(...args),
      clock = () => Date.now(),
      timers = undefined,
      random = Math.random,
      log = defaultLog,
    } = {},
  ) {
    this.ctx = ctx;
    this.env = env;
    this.clock = clock;
    this.log = log;
    this.guildId = env.GUILD_ID;
    this.rest = createRest({ token: env.DISCORD_BOT_TOKEN, fetcher: fetchImpl });
    this.threads = new Set(); // #help threads (and their ids only), kept in storage
    this.seen = new Set(); // recent message ids handled by this object, in memory only
    this.help = createHelp({
      rest: this.rest,
      ai: env.AI,
      knowledge,
      limits: new Limits({ clock }),
      memory: new ChatMemory({ clock }),
      config: { guildId: this.guildId, channels: CHANNELS, model: MODEL },
      clock,
      log,
    });
    this.link = new GatewayLink({
      token: env.DISCORD_BOT_TOKEN,
      openSocket: (url, handlers) => openWebSocket(url, handlers, fetchImpl),
      getGatewayUrl: async () => (await this.rest.get('/gateway/bot')).url,
      store: { load: () => ctx.storage.get('gateway'), save: (value) => ctx.storage.put('gateway', value) },
      clock,
      timers,
      random,
      log,
      onDispatch: (t, d) => this.dispatch(t, d),
    });
    this.ready = ctx.blockConcurrencyWhile(async () => {
      await this.link.restore();
      this.threads = new Set((await ctx.storage.get('help_threads')) ?? []);
    });
  }

  /** Applies one Gateway dispatch: thread bookkeeping, or a message for the #help flow. */
  dispatch(t, d) {
    const action = routeEvent(t, d, { guildId: this.guildId, helpChannel: CHANNELS.help, isHelpThread: (id) => this.threads.has(id) });
    switch (action.type) {
      case 'threads':
        for (const id of action.ids) this.rememberThread(id);
        return this.saveThreads();
      case 'thread-add':
        this.rememberThread(action.id);
        return this.saveThreads();
      case 'thread-remove':
        return this.threads.delete(action.id) ? this.saveThreads() : undefined;
      case 'message':
        return this.handleMessage(action.message);
      default:
        return undefined;
    }
  }

  handleMessage(message) {
    if (this.seen.has(message.id)) return undefined;
    this.seen.add(message.id);
    if (this.seen.size > SEEN_CAP) this.seen.delete(this.seen.values().next().value);
    return this.help.handle(message, { botId: this.link.botId }).catch((error) => this.log('message handling failed', { error: error?.name ?? 'Error' }));
  }

  rememberThread(id) {
    this.threads.add(id);
    if (this.threads.size > THREAD_CAP) this.threads.delete(this.threads.values().next().value);
  }

  saveThreads() {
    return Promise.resolve(this.ctx.storage.put('help_threads', [...this.threads])).catch((error) =>
      this.log('thread save failed', { error: error?.name ?? 'Error' }),
    );
  }

  /** GET /ensure (from the cron): connects if needed and answers with the state, which holds no secret. */
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/ensure') {
      const state = await this.ensure();
      return new Response(JSON.stringify({ state }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }
    return new Response('Not found', { status: 404 });
  }

  /** The alarm: the same check as the cron, and it sets the next alarm (ensure always does). */
  async alarm() {
    await this.ensure();
  }

  async ensure() {
    await this.ready;
    const state = await this.link.ensure();
    await this.ctx.storage.setAlarm(this.clock() + ALARM_MS);
    return state;
  }
}

/** Opens the Gateway socket: fetch with an Upgrade header, then accept; events go to the link's handlers. */
async function openWebSocket(url, handlers, fetchImpl) {
  const response = await fetchImpl(url, { headers: { Upgrade: 'websocket' } });
  const socket = response.webSocket;
  if (!socket) throw new Error('the gateway did not accept the socket');
  socket.accept();
  socket.addEventListener('message', (event) => handlers.message(String(event.data)));
  socket.addEventListener('close', (event) => handlers.close(event.code));
  socket.addEventListener('error', () => handlers.close(1011));
  return {
    send: (text) => socket.send(text),
    close: (code, reason) => {
      try {
        socket.close(code, reason);
      } catch {
        // Already closed.
      }
    },
  };
}
