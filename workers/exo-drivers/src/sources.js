// The five product lines the watch reads, in watch.py's order (seed.js maps state.json's last_seed_message_ids by this order),
// and how each page is read. The parsing is watch.py's; test/fixtures holds pages of the shape it reads.

/** Sent with every page read. TechPowerUp and AMD answer a browser; a refusal is recorded as an error, never a silent miss. */
export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const TPU = 'https://www.techpowerup.com/download'

/**
 * username and roleId are the old webhook's name and the product's silent role; color is the card's stripe. official marks
 * the product that also reads amd.com's release notes (watch.py's "official": "amd_radeon").
 */
export const SOURCES = [
  {
    vendor: 'NVIDIA', product: 'gpu_geforce', kind: 'GPU', label: 'NVIDIA GeForce',
    url: `${TPU}/nvidia-geforce-graphics-drivers/`, color: 0x76b900,
    username: 'NVIDIA GPU Releases', roleId: '1564735523732324432',
  },
  {
    vendor: 'AMD', product: 'gpu_radeon', kind: 'GPU', label: 'AMD Radeon',
    url: `${TPU}/amd-radeon-graphics-drivers/`, color: 0xed1c24,
    username: 'AMD GPU Releases', roleId: '1564735526794432604', official: 'amd_radeon',
  },
  {
    vendor: 'AMD', product: 'cpu_chipset', kind: 'CPU', label: 'AMD Ryzen Chipset',
    url: `${TPU}/amd-ryzen-chipset-drivers/`, color: 0xb91c1c,
    username: 'AMD CPU Releases', roleId: '1564735529600286902',
  },
  {
    vendor: 'INTEL', product: 'gpu_graphics', kind: 'GPU', label: 'Intel Graphics',
    url: `${TPU}/intel-graphics-drivers/`, color: 0x0071c5,
    username: 'Intel GPU Releases', roleId: '1564735532871848016',
  },
  {
    vendor: 'INTEL', product: 'cpu_npu', kind: 'CPU', label: 'Intel NPU',
    url: `${TPU}/intel-npu-drivers/`, color: 0x00a3e0,
    username: 'Intel CPU Releases', roleId: '1564735535732232212',
  },
]

export const productKey = (src) => `${src.vendor}:${src.product}`

/** A page that answered with an error status. The message names the host only. */
export class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} from ${new URL(url).hostname}`)
    this.status = status
  }
}

/** One GET with the browser-like User-Agent: the page's text, or an HttpError (or an error when the host cannot be reached). */
export async function fetchPage(fetcher, url) {
  let res
  try {
    res = await fetcher(url, {
      headers: { 'user-agent': BROWSER_UA, accept: 'text/html,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' },
    })
  } catch {
    throw new Error(`could not reach ${new URL(url).hostname}`)
  }
  if (!res.ok) throw new HttpError(res.status, url)
  return res.text()
}

const TITLE = /<title>([^<]+)<\/title>/i
const LATEST = /Latest\s+(.+?)\s+Download\s*\|\s*TechPowerUp/i
const WITH_VERSION = /^(?<label>.+?)\s+(?<version>\d+(?:\.\d+){1,4})\s*(?<tag>(?:WHQL|Beta|Hotfix|Hot-Fix|HF|Security)?)\s*$/i
const ANY_VERSION = /(?<label>.+?)\s+(?<version>\d+(?:\.\d+){1,4})\b(?:\s+(?<tag>WHQL|Beta|Hotfix|Hot-Fix|HF|Security))?/i
const DATE = /class="[^"]*date[^"]*"[^>]*>\s*([^<]+?)\s*</i
const HOTFIX_WORDS = ['hotfix', 'hot-fix', 'hot fix', 'security update']

/** The newest version a TechPowerUp download page shows: { version, tag, label, date, title_line }, or null. */
export function parseTpuLatest(html, fallbackLabel) {
  const title = (TITLE.exec(html)?.[1] ?? '').trim()
  // "Latest NVIDIA GeForce Graphics Drivers 621.01 WHQL Download | TechPowerUp"
  const latest = LATEST.exec(title)?.[1]?.trim()
  let line = latest !== undefined ? latest : title.replace('| TechPowerUp', '').trim()
  if (!line && title) line = title.split('|')[0].trim()
  if (!line) return null

  let version
  let tag
  let label
  const withVersion = WITH_VERSION.exec(line)
  if (withVersion) {
    ;({ version } = withVersion.groups)
    tag = withVersion.groups.tag.trim()
    label = withVersion.groups.label.trim()
  } else {
    const anyVersion = ANY_VERSION.exec(line)
    if (!anyVersion) return null
    version = anyVersion.groups.version
    tag = (anyVersion.groups.tag ?? '').trim()
    label = anyVersion.groups.label.trim() || fallbackLabel
  }

  const date = (DATE.exec(html)?.[1] ?? '').trim()
  const low = `${line} ${title}`.toLowerCase()
  const hotfix = HOTFIX_WORDS.some((word) => low.includes(word))
  if (low.includes('beta') && !tag) tag = 'Beta'
  if (hotfix && !/hotfix|security/i.test(tag)) tag = tag ? `${tag} Hotfix` : 'Hotfix'
  return { version, tag, label, date, title_line: line }
}

/** AMD's release-notes page for Adrenalin version y.m.n: RN-RAD-WIN-y-m-n.html. */
export const amdReleaseNotesUrl = ([y, m, n]) =>
  `https://www.amd.com/en/resources/support-articles/release-notes/RN-RAD-WIN-${y}-${m}-${n}.html`

/** Strip HTML tags to a fixed point so nested or unclosed fragments cannot survive. */
function stripTags(raw) {
  let prev = ''
  let cur = String(raw)
  while (cur !== prev) {
    prev = cur
    cur = cur.replace(/<[^>]*>/g, '')
  }
  return cur.replace(/[<>]/g, '')
}

/** amd.com's page for y.m.n, or null when the page is not a release note for that version. */
export function parseAmdReleaseNotes(html, [y, m, n]) {
  const version = `${y}.${m}.${n}`
  const title = (TITLE.exec(html)?.[1] ?? '').trim()
  const low = title.toLowerCase()
  if (!title.includes(version) || !low.includes('adrenalin')) return null
  // Optional and Preview builds are announced without a tag (watch.py: "Eric: keep the name clean").
  let tag = ''
  if (low.includes('optional') || low.includes('preview')) tag = ''
  else if (low.includes('beta')) tag = 'Beta'
  else if (low.includes('hotfix')) tag = 'Hotfix'
  const updated = /Last Updated(?:<\/b>)?\s*:?\s*(.{0,80}?\d{4})/is.exec(html)
  const date = updated
    ? stripTags(updated[1]).trim().replace(/\.+$/, '').replace(/\s+/g, ' ').replace(/(\d)\s+(st|nd|rd|th)\b/g, '$1$2')
    : ''
  return { version, tag, label: 'AMD Radeon', date, title_line: title, url: amdReleaseNotesUrl([y, m, n]), source: 'amd.com' }
}

/** Numbers of a dotted version ('26.11.1' -> [26, 11, 1]); [] when it is not one. */
export function vtuple(version) {
  const parts = String(version ?? '').split('.')
  return parts.every((part) => /^\d+$/.test(part)) ? parts.map(Number) : []
}

/** Negative, zero or positive as a is older than, equal to or newer than b (a missing part is the lowest). */
export function compareVersions(a, b) {
  const x = vtuple(a)
  const y = vtuple(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1)
    if (d) return d
  }
  return 0
}

/** A 404 is "no such page"; any other refusal throws, and the caller records it. */
async function releaseNote(version, fetchHtml) {
  try {
    return parseAmdReleaseNotes(await fetchHtml(amdReleaseNotesUrl(version)), version)
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null
    throw error
  }
}

/**
 * Walks forward from the newest known version through amd.com's release notes (watch.py probe_amd_radeon): next N, N+2,
 * next month's .1, then next year's 1.1, repeated until nothing newer exists. Returns the newest page found, or null.
 */
export async function probeAmdRadeon(known, fetchHtml) {
  const start = vtuple(known)
  if (start.length !== 3) return null
  let [y, m, n] = start
  let best = null
  for (let step = 0; step < 12; step++) {
    const candidates = [[y, m, n + 1], [y, m, n + 2]]
    if (m < 12) candidates.push([y, m + 1, 1])
    candidates.push([y + 1, 1, 1])
    let found = null
    for (const candidate of candidates) {
      const info = await releaseNote(candidate, fetchHtml)
      if (info) {
        found = { candidate, info }
        break
      }
    }
    if (!found) break
    ;[y, m, n] = found.candidate
    best = found.info
  }
  return best
}

/**
 * The version a source reports now (watch.py's per-product read). TechPowerUp down or unparseable for the official product:
 * the amd.com probe still runs from the last known version (DRIVER_WATCH.md). Returns { info, notes, failures }: notes say what
 * was found, failures say what could not be read (the run records each one, so a refusal is never silent). Throws when
 * there is no version to fall back on.
 */
export async function readSource(src, prev, fetcher) {
  const notes = []
  const failures = []
  let info
  try {
    info = parseTpuLatest(await fetchPage(fetcher, src.url), src.label)
    if (!info) throw new Error('the page has no driver title (blocked or changed)')
  } catch (error) {
    if (!src.official || !prev?.version) throw error
    failures.push(`TechPowerUp: ${error.message}; the amd.com probe runs from the last known version`)
    info = { version: prev.version, tag: prev.tag ?? '', date: prev.date ?? '', url: prev.url ?? src.url, label: src.label }
  }

  if (src.official === 'amd_radeon') {
    const base = compareVersions(prev?.version, info.version) > 0 ? prev.version : info.version
    try {
      const off = await probeAmdRadeon(base, (url) => fetchPage(fetcher, url))
      if (off && compareVersions(off.version, info.version) > 0) {
        notes.push(`amd.com has ${off.version}${off.tag ? ` ${off.tag}` : ''} (TechPowerUp shows ${info.version})`)
        info = off
      }
    } catch (error) {
      failures.push(`amd.com probe failed: ${error.message}`)
    }
  }
  return { info, notes, failures }
}
