// The Worker's routes: POST /interactions (the slash commands), and the cron that keeps the Gateway object connected.
import { handleInteraction } from './interactions.js';

export async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname === '/interactions') {
    return handleInteraction(request, env, { background: (promise) => ctx.waitUntil(promise) });
  }
  return new Response('Not found', { status: 404 });
}

/** The cron (every minute): asks the Gateway object to connect if it is idle. */
export function scheduled(event, env, ctx) {
  ctx.waitUntil(ensureGateway(env));
}

export async function ensureGateway(env) {
  try {
    const stub = env.GATEWAY.get(env.GATEWAY.idFromName('main'));
    const response = await stub.fetch('https://gateway.internal/ensure');
    const { state } = await response.json();
    return state;
  } catch (error) {
    console.log(JSON.stringify({ bot: 'ensure failed', error: error?.name ?? 'Error' }));
    return 'failed';
  }
}
