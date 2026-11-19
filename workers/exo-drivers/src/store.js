// DRIVERS, the KV namespace: one record per product (keyed "VENDOR:product"), legacy_cards (the seed's old cards, listed and
// never deleted), meta (when the last real run ended and what failed in it) and run_lock (a short lock against two runs).
// KV has no compare-and-set: the lock is best effort, so the posting rules never depend on it alone (run.js).

const LEGACY = 'legacy_cards'
const META = 'meta'
const LOCK = 'run_lock'
const LOCK_SECONDS = 600

async function readJson(kv, key) {
  const text = await kv.get(key)
  return text ? JSON.parse(text) : null
}

export class Store {
  constructor(kv) {
    this.kv = kv
  }

  getProduct(key) {
    return readJson(this.kv, key)
  }

  async putProduct(key, record) {
    await this.kv.put(key, JSON.stringify(record))
  }

  async legacyCards() {
    return (await readJson(this.kv, LEGACY)) ?? []
  }

  getMeta() {
    return readJson(this.kv, META)
  }

  async putMeta(meta) {
    await this.kv.put(META, JSON.stringify(meta))
  }

  /** True when this run holds the lock. The lock expires on its own after LOCK_SECONDS, so a crashed run cannot hold it. */
  async acquireLock(nowMs) {
    if (await this.kv.get(LOCK)) return false
    await this.kv.put(LOCK, String(nowMs), { expirationTtl: LOCK_SECONDS })
    return true
  }

  async releaseLock() {
    await this.kv.delete(LOCK)
  }
}
