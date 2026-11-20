// The three Discord calls a card needs, all through the one webhook: POST the card (?wait=true, so Discord returns its id),
// PATCH its content empty (the role ping leaves no mention line), and DELETE a card it replaces. Errors carry a status and a
// short reason, never the webhook URL.

const USER_AGENT = 'ExoDriverWatch/1.0 (driver release monitor)'

export class DiscordError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

/** POST the card. Throws, changing nothing, when Discord refuses it. Returns the new message's id. */
export async function postCard(base, payload, fetcher) {
  const res = await call(fetcher, `${base}?wait=true`, { method: 'POST', body: payload }, 'post the card')
  const message = await res.json().catch(() => null)
  if (!message?.id) throw new DiscordError('Discord answered the card without a message id')
  return String(message.id)
}

/** PATCH the content to empty. Returns the reason it failed, or null. A failure leaves a role mention line, nothing more. */
export async function clearContent(base, id, fetcher) {
  try {
    await call(fetcher, `${base}/messages/${id}`, { method: 'PATCH', body: { content: '' } }, 'clear the role markup')
    return null
  } catch (error) {
    return error.message
  }
}

/** DELETE a card. A card already gone (404) counts as deleted. Any other refusal throws and the caller keeps the id. */
export async function deleteCard(base, id, fetcher) {
  await call(fetcher, `${base}/messages/${id}`, { method: 'DELETE' }, 'delete the card', [404])
}

async function call(fetcher, url, { method, body }, what, alsoOk = []) {
  let res
  try {
    res = await fetcher(url, {
      method,
      headers: body === undefined ? { 'user-agent': USER_AGENT } : { 'user-agent': USER_AGENT, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new DiscordError(`could not reach Discord to ${what}`)
  }
  if (res.ok || alsoOk.includes(res.status)) return res
  throw new DiscordError(`Discord refused to ${what} (HTTP ${res.status})`, res.status)
}
