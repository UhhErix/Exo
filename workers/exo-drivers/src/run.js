// One run of the watch (watch.py's check_once). For each product: retry the card deletes an earlier run could not finish,
// read the source, and when it shows a version nobody has announced, post the card through the one webhook, record it, and
// only then delete the card it replaces. A dry run reads and answers, and writes nothing. A problem with one product is
// recorded (in the report, and in meta for a real run) and the other products still run.
import { SOURCES, productKey, readSource, vtuple, compareVersions } from './sources.js'
import { avatarUrl, cardPayload, isDiscordWebhook, shortTitle, webhookBase } from './cards.js'
import { clearContent, deleteCard, postCard } from './discord.js'

/** Versions kept per product in posted_versions (watch.py keeps 20). */
const KEEP_POSTED = 20
/** The pause after each card, as watch.py has it, so the one webhook is not rate limited. */
const POST_PAUSE_MS = 1200

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs the watch once. Returns the report: dryRun, checkedAt, webhook ('set', or why no card can be posted), products (one entry
 * per product: what it found, what it did or would do, the cards it deletes, the legacy cards it leaves alone, notes), errors
 * (product and reason, also kept in meta for a real run) and legacy_cards (the seed's cards, for deleting by hand). skipped
 * says why a run did nothing.
 */
export async function runCheck({
  env = {},
  store,
  fetcher = (...args) => globalThis.fetch(...args),
  dryRun = false,
  now = () => new Date(),
  sources = SOURCES,
  pause = sleep,
}) {
  const checkedAt = now().toISOString()
  const hook = webhookFrom(env)
  const legacy = await store.legacyCards()
  const report = { dryRun, checkedAt, webhook: hook.problem ?? 'set', products: {}, errors: [], legacy_cards: legacy }
  if (!dryRun && !(await store.acquireLock(now().getTime()))) return { ...report, skipped: 'another run is in progress' }
  try {
    const ctx = { store, fetcher, base: hook.base, problem: hook.problem, dryRun, legacy, pause }
    for (const src of sources) {
      const { key, entry, errors } = await checkProduct(src, ctx)
      report.products[key] = entry
      for (const error of errors) report.errors.push({ product: key, error })
    }
    if (!dryRun) await store.putMeta({ checkedAt, errors: report.errors })
  } finally {
    if (!dryRun) await store.releaseLock()
  }
  return report
}

function webhookFrom(env) {
  const url = env.DISCORD_WEBHOOK
  if (!url) return { base: null, problem: 'DISCORD_WEBHOOK is not set: no card is posted' }
  if (!isDiscordWebhook(url)) return { base: null, problem: 'DISCORD_WEBHOOK is not a Discord webhook: no card is posted' }
  return { base: webhookBase(url) }
}

async function checkProduct(src, ctx) {
  const key = productKey(src)
  const entry = {
    vendor: src.vendor,
    kind: src.kind,
    label: src.label,
    username: src.username,
    avatar_url: avatarUrl(src.vendor),
    previous: null,
    detected: null,
    action: 'none',
    title: null,
    deletes: [],
    legacy_skipped: ctx.legacy.filter((card) => card.product === key).map((card) => card.message_id),
    notes: [],
  }
  const errors = []
  const done = () => ({ key, entry, errors })
  const rec = { delete_pending: [] }
  let stored = null
  const save = async () => {
    if (ctx.dryRun || JSON.stringify(rec) === JSON.stringify(stored)) return
    await ctx.store.putProduct(key, rec)
    stored = JSON.parse(JSON.stringify(rec))
  }

  try {
    const prev = await ctx.store.getProduct(key)
    stored = prev
    entry.previous = prev?.version ?? null
    Object.assign(rec, prev ?? {}, { delete_pending: [...(prev?.delete_pending ?? [])] })

    // Cards an earlier run could not delete are tried first.
    if (rec.delete_pending.length) {
      if (ctx.dryRun) entry.deletes.push(...rec.delete_pending)
      else if (ctx.base) rec.delete_pending = await removeCards(rec.delete_pending, ctx, entry, errors)
      else errors.push(ctx.problem)
    }

    const { info, notes, failures } = await readSource(src, prev, ctx.fetcher)
    entry.notes.push(...notes, ...failures)
    errors.push(...failures)
    const fields = {
      vendor: src.vendor,
      kind: src.kind,
      label: src.label,
      version: info.version,
      tag: info.tag ?? '',
      date: info.date ?? '',
      url: info.url || src.url,
    }
    entry.detected = { version: fields.version, tag: fields.tag, date: fields.date, url: fields.url }

    // A source behind what is already recorded (TechPowerUp lagging) changes nothing.
    if (prev?.version && vtuple(info.version).length && vtuple(prev.version).length && compareVersions(info.version, prev.version) < 0) {
      entry.action = 'behind'
      entry.notes.push(`source is behind the record (${info.version} < ${prev.version}); keeping ${prev.version}`)
      await save()
      return done()
    }

    // A product with no record yet: its current version is recorded as announced, so nothing posts on a first run.
    if (!prev?.version) {
      entry.action = 'baseline'
      Object.assign(rec, fields, { posted_versions: [info.version] })
      await save()
      return done()
    }

    // Already announced: the record follows the source's tag, date and link, and nothing posts.
    const posted = prev.posted_versions ?? []
    if (posted.includes(info.version)) {
      entry.action = 'none'
      Object.assign(rec, fields)
      await save()
      return done()
    }

    // A new version. Without a webhook it is recorded (not as posted), so the card goes out once the webhook is set.
    entry.title = shortTitle(src, info)
    if (!ctx.base) {
      entry.action = 'skip-no-secret'
      entry.notes.push('DISCORD_WEBHOOK is not set: the card is skipped and posts once it is set')
      errors.push(ctx.problem)
      console.warn(`driver watch: ${key}: ${ctx.problem}`)
      Object.assign(rec, fields)
      await save()
      return done()
    }
    if (ctx.dryRun) {
      entry.action = 'post'
      if (prev.message_id) entry.deletes.push(prev.message_id)
      return done()
    }

    // The card is posted and its id recorded before anything is deleted, so a delete that fails is retried, never reposted.
    const mid = await postCard(ctx.base, cardPayload(src, info), ctx.fetcher)
    const unclear = await clearContent(ctx.base, mid, ctx.fetcher)
    if (unclear) entry.notes.push(`card ${mid} keeps its role markup: ${unclear}`)
    // A seeded card is legacy: it is not message_id, so it is never deleted here (legacy_cards lists it for deleting by hand).
    const replaced = prev.message_id ? [prev.message_id] : []
    Object.assign(rec, fields, {
      posted_versions: [...posted, info.version].slice(-KEEP_POSTED),
      message_id: mid,
      delete_pending: [...rec.delete_pending, ...replaced],
    })
    await save()
    rec.delete_pending = await removeCards(rec.delete_pending, ctx, entry, errors)
    await save()
    await ctx.pause(POST_PAUSE_MS)
    entry.action = 'posted'
    entry.message_id = mid
    return done()
  } catch (error) {
    entry.action = 'error'
    entry.error = error.message
    errors.push(error.message)
    try {
      await save()
    } catch {
      // The state write failed too: the next run finds what it can.
    }
    return done()
  }
}

/** DELETEs each card through the webhook. Returns the ids Discord refused, to be tried again on the next run. */
async function removeCards(ids, ctx, entry, errors) {
  const left = []
  for (const id of ids) {
    entry.deletes.push(id)
    try {
      await deleteCard(ctx.base, id, ctx.fetcher)
    } catch (error) {
      left.push(id)
      const message = `card ${id} is not deleted yet (${error.message}); the next run tries again`
      entry.notes.push(message)
      errors.push(message)
    }
  }
  return left
}
