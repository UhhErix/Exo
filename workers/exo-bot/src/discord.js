// The Discord REST calls the bot makes, with the bot token. A failed call throws a DiscordError carrying only the status:
// the caller logs the status, never the path's content or the token.
export const API = 'https://discord.com/api/v10';
const USER_AGENT = 'DiscordBot (https://bot.getexo.app, 1.0)';

export class DiscordError extends Error {
  constructor(status) {
    super(`Discord answered ${status}`);
    this.name = 'DiscordError';
    this.status = status;
  }
}

export function createRest({ token, fetcher = (...args) => globalThis.fetch(...args) }) {
  async function call(method, path, body) {
    const init = { method, headers: { authorization: `Bot ${token}`, 'user-agent': USER_AGENT } };
    if (body !== undefined) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const response = await fetcher(`${API}${path}`, init);
    if (!response.ok) throw new DiscordError(response.status);
    return response.status === 204 ? null : response.json();
  }
  return {
    get: (path) => call('GET', path),
    post: (path, body) => call('POST', path, body),
    put: (path, body) => call('PUT', path, body),
  };
}
