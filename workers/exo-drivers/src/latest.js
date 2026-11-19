// GET /v1/latest: the newest version of each product, as the Exo app reads it. Nothing in it is a secret or a webhook id.
import { SOURCES, productKey } from './sources.js'

export async function latestJson(store, sources = SOURCES) {
  const products = {}
  for (const src of sources) {
    const rec = await store.getProduct(productKey(src))
    if (!rec?.version) continue
    products[productKey(src)] = {
      vendor: src.vendor,
      kind: src.kind,
      label: src.label,
      version: rec.version,
      tag: rec.tag ?? '',
      date: rec.date ?? '',
      url: rec.url ?? src.url,
    }
  }
  const meta = await store.getMeta()
  return { products, checkedAt: meta?.checkedAt ?? null }
}
