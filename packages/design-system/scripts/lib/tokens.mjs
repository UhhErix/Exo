// Reads tokens/tokens.json (W3C design tokens: $type, $value, $extensions) and resolves it: references become values,
// {value, unit} dimensions and durations become numbers. Also the colour maths the contrast tests use. No dependencies.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const TOKENS_FILE = path.resolve(here, '../../tokens/tokens.json')

export function loadTokens(file = TOKENS_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

// Every leaf (an object with $value), by dotted path.
export function flatten(tree, prefix = [], out = new Map()) {
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith('$') || !node || typeof node !== 'object') continue
    const at = [...prefix, key]
    if ('$value' in node) out.set(at.join('.'), node)
    else flatten(node, at, out)
  }
  return out
}

const REF = /^\{([^}]+)\}$/

// The dotted paths a value refers to, anywhere inside it.
export function refsIn(value, out = []) {
  if (typeof value === 'string') {
    const m = REF.exec(value)
    if (m) out.push(m[1])
  } else if (Array.isArray(value)) {
    for (const v of value) refsIn(v, out)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) refsIn(v, out)
  }
  return out
}

// Resolved tokens: Map path -> { type, value, ext, description }. A {value, unit} object collapses to its number.
export function resolve(tree) {
  const leaves = flatten(tree)
  const done = new Map()
  const busy = new Set()

  const token = (p) => {
    if (done.has(p)) return done.get(p).value
    if (busy.has(p)) throw new Error(`reference cycle through ${p}`)
    const leaf = leaves.get(p)
    if (!leaf) throw new Error(`no token at ${p}`)
    busy.add(p)
    let value = subst(leaf.$value)
    // A curve keeps its kind, so a motion's channel says whether it is a cubic-bezier or a spring.
    if (leaf.$type === 'cubicBezier') value = { type: 'cubicBezier', value }
    if (leaf.$type === 'spring') value = { type: 'spring', value }
    busy.delete(p)
    done.set(p, { type: leaf.$type, value, ext: leaf.$extensions?.exo ?? {}, description: leaf.$description ?? '' })
    return value
  }

  const subst = (x) => {
    if (typeof x === 'string') {
      const m = REF.exec(x)
      return m ? token(m[1]) : x
    }
    if (Array.isArray(x)) return x.map(subst)
    if (x && typeof x === 'object') {
      if (typeof x.value === 'number' && typeof x.unit === 'string') return x.value
      const o = {}
      for (const [k, v] of Object.entries(x)) o[k] = subst(v)
      return o
    }
    return x
  }

  for (const p of leaves.keys()) token(p)
  return done
}

export function hexOf(components) {
  return '#' + components.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
}

// WCAG 2.x relative luminance of an opaque sRGB colour with components in [0,1].
export function luminance({ r, g, b }) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// Source-over: fg (alpha a, default 1) over an opaque bg.
export function compositeOver(fg, bg) {
  const a = fg.a ?? 1
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) }
}

export function contrastRatio(fg, bg) {
  const top = compositeOver(fg, bg)
  const l1 = luminance(top)
  const l2 = luminance(bg)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

// What a glass tone shows of an opaque backdrop: brightness, then contrast about mid grey, then its tint over it.
// Backdrops here are neutral greys, so saturation changes nothing and is not applied.
export function backdropThroughGlass(backdrop, glass) {
  const clamp = (v) => Math.min(1, Math.max(0, v))
  const c = glass.contrast ?? 1
  const toned = (v) => clamp((clamp(v * glass.brightness) - 0.5) * c + 0.5)
  const under = { r: toned(backdrop.r), g: toned(backdrop.g), b: toned(backdrop.b) }
  const tint = glass.tint
  return compositeOver({ r: tint.components[0], g: tint.components[1], b: tint.components[2], a: tint.alpha }, under)
}
