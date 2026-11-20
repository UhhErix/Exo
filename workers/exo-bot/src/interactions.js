// The Interactions endpoint (POST /interactions): the Ed25519 signature check, the PING Discord sends when the endpoint is
// saved, and the four slash commands. Discord checks the signature on every request, so an unsigned request gets 401.
//
// How it could fail: a request with a bad or missing signature runs a command (the check must come first); a deferred reply
// is never edited (the member sees "thinking" forever); the interaction token reaches a log (it is never logged).
import { API } from './discord.js';
import { DEFERRED, downloadReply, driversReply, helpReply, versionReply } from './commands.js';

const MAX_BODY = 65_536;
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const DEFERRED_MESSAGE = 5;

export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Discord signs timestamp + body with the application's Ed25519 key. False for any problem, never a throw. */
export async function verifyInteraction({ publicKey, timestamp, body, signature }) {
  try {
    if (!/^[0-9a-f]{64}$/i.test(publicKey ?? '') || !/^[0-9a-f]{128}$/i.test(signature ?? '') || !timestamp) return false;
    const key = await crypto.subtle.importKey('raw', hexToBytes(publicKey), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, hexToBytes(signature), new TextEncoder().encode(timestamp + body));
  } catch {
    return false;
  }
}

/**
 * Answers one Interactions request. `background` takes a promise that finishes a deferred reply (the Worker passes
 * ctx.waitUntil); `fetcher` is fetch (tests pass a fake).
 */
export async function handleInteraction(request, env, { background = (promise) => promise, fetcher = (...args) => globalThis.fetch(...args) } = {}) {
  if (!env.DISCORD_PUBLIC_KEY) return text('DISCORD_PUBLIC_KEY is not set', 503);
  const body = await request.text();
  if (body.length > MAX_BODY) return text('request too large', 413);
  const verified = await verifyInteraction({
    publicKey: env.DISCORD_PUBLIC_KEY,
    timestamp: request.headers.get('x-signature-timestamp'),
    body,
    signature: request.headers.get('x-signature-ed25519'),
  });
  if (!verified) return text('invalid request signature', 401);
  let interaction;
  try {
    interaction = JSON.parse(body);
  } catch {
    return text('bad request', 400);
  }
  if (interaction.type === 1) return json({ type: PONG });
  if (interaction.type !== 2) return text('unsupported interaction', 400);
  return command(interaction, { background, fetcher });
}

function command(interaction, { background, fetcher }) {
  const name = interaction.data?.name;
  if (name === 'download') return json({ type: CHANNEL_MESSAGE, data: { content: downloadReply() } });
  if (name === 'help') return json({ type: CHANNEL_MESSAGE, data: { content: helpReply() } });
  if (DEFERRED.has(name)) {
    const work = name === 'version' ? versionReply(fetcher) : driversReply(fetcher);
    background(editOriginal(interaction, work, fetcher));
    return json({ type: DEFERRED_MESSAGE });
  }
  return json({ type: CHANNEL_MESSAGE, data: { content: 'I do not know that command.' } });
}

/** Puts the finished answer into the deferred reply. The interaction token is never logged. */
async function editOriginal(interaction, work, fetcher) {
  let content;
  try {
    content = await work;
  } catch {
    content = 'I could not answer that just now.';
  }
  const url = `${API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  try {
    await fetcher(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, 1990) }),
    });
  } catch (error) {
    console.log(JSON.stringify({ bot: 'edit failed', error: error?.name ?? 'Error' }));
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function text(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
