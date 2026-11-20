// The card, as watch.py builds it: the title rules, a short embed, and the silent role ping (discord.js posts it with the role
// in content and flags 4096, then clears the content). Every card goes through the one webhook, under the product's own name
// and logo. Pure: no network.

/** Discord's SUPPRESS_NOTIFICATIONS flag: the role mention fires without a notification sound. */
export const SUPPRESS_NOTIFICATIONS = 4096

/** Where the logos are served from (src/worker.js, /avatars/<vendor>.png). */
export const AVATAR_BASE = 'https://drivers.getexo.app/avatars'

const FOOTER = 'Exo driver watch'
const HIDDEN_TAG = /\b(optional|preview)\b/gi

/** The vendor's logo, as the Worker serves it. */
export const avatarUrl = (vendor) => `${AVATAR_BASE}/${vendor.toLowerCase()}.png`

/** The tag a card shows. Never 'Optional' or 'Preview' (the title rules in watch.py). */
export function cardTag(info) {
  return String(info.tag ?? '').replace(HIDDEN_TAG, '').replace(/\s+/g, ' ').trim()
}

/** 'NVIDIA GeForce 621.24 WHQL'. */
export function shortTitle(src, info) {
  const tag = cardTag(info)
  return `${src.label} ${info.version}${tag ? ` ${tag}` : ''}`.slice(0, 256)
}

/** The short embed: the title, one line, the link and the footer. No field triple. */
export function buildEmbed(src, info) {
  const tag = cardTag(info)
  let description = info.date ? `Released ${info.date} · ${src.kind} driver` : `New ${src.kind} driver release`
  if (tag && !description.toLowerCase().includes(tag.toLowerCase())) description += ` (${tag})`
  return {
    title: shortTitle(src, info),
    url: info.url || src.url,
    description: description.slice(0, 200),
    color: src.color,
    footer: { text: FOOTER },
  }
}

/** The POST body: the product's name and logo, the silent role ping, and the card. */
export function cardPayload(src, info) {
  return {
    username: src.username,
    avatar_url: avatarUrl(src.vendor),
    content: `<@&${src.roleId}>`,
    allowed_mentions: { parse: [], roles: [src.roleId] },
    flags: SUPPRESS_NOTIFICATIONS,
    embeds: [buildEmbed(src, info)],
  }
}

/** True only for an https Discord webhook on the default port, with no user info; a query string (thread_id) is allowed. */
export function isDiscordWebhook(url) {
  if (typeof url !== 'string') return false
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return parsed.protocol === 'https:' && parsed.port === '' && !parsed.username && !parsed.password &&
    ['discord.com', 'discordapp.com'].includes(parsed.hostname) && /^\/api\/webhooks\/\d+\/[\w-]+\/?$/.test(parsed.pathname)
}

/** The webhook without its query string, so /messages/<id> can be added to it. */
export function webhookBase(url) {
  const parsed = new URL(url)
  parsed.search = ''
  return parsed.href.replace(/\/$/, '')
}
