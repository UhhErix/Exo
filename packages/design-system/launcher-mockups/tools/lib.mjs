// Exo Launcher mock-up kit: the shipping design's own values (read from the running 3.26 UI by tools/ui-pass/tokens.mjs),
// as small functions that emit inline-styled HTML for design-canvas boards.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ICONS = JSON.parse(readFileSync(join(ROOT, 'tools', 'icons.json'), 'utf8'))

// ---- tokens (tokens.css as computed in the app) ----
export const FONT = "'Geist', 'Segoe UI Variable', 'Segoe UI', sans-serif"
export const INK = '#ffffff', INK2 = '#e4e4e4', INK3 = '#b4b4b4', LIVE = '#3dd68c', WARN = '#ffb224', BAD = '#ff6369'
// The one line (owner, 2026-11-10: outlines looked uneven, smeared and heavy). One colour, one weight, everywhere: an outline,
// a divider, a sheet. --hair is one device pixel, so the line is as thin and as sharp at 125% or 150% as at 100%. What is
// chosen is never outlined (owner, 2026-11-10: "hate the outline thing when selecting"): a chosen tab, segment or chip is a
// solid white pill with black words, as the primary button is; a chosen row in a list has a white marker at its left edge
// and full-ink words, the rest a step dimmer.
export const LINE = '#2e2e2e', HAIR = 'var(--hair, 1px)'
export const RIM = `inset 0 0 0 ${HAIR} ${LINE}`
export const RULE = `${HAIR} solid ${LINE}`
/** A chosen pill (tab, segment, chip): white, black words. */
export const ON = 'background: #fff; color: #000'
/** A chosen row's marker; the row is position: relative. */
export const marker = (left = 0) => `<span style="position: absolute; left: ${left}px; top: 50%; width: 3px; height: 16px; margin-top: -8px; border-radius: 999px; background: #fff"></span>`
// Solid since 3.26 (no Liquid Glass): a control is black with its hairline; a float is a near-black slab with the same hairline.
export const GLASS = `background-color: #000; box-shadow: ${RIM}`
export const SLAB = `background-color: #000; box-shadow: ${RIM}`
export const PLATE = `background-color: rgba(0,0,0,0.72)`
export const PANEL = `border-radius: 18px; box-shadow: ${RIM}; background: rgba(0,0,0,0.0)`
export const HOVER = 'rgba(255,255,255,0.10)', SELECTED = 'rgba(255,255,255,0.15)', TILE = '#000', TRACK = 'rgba(255,255,255,0.17)'
export const G = 10 // the app's gutter

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

// ---- icons: the app's own (Tabler, as the Bar draws them), resized; plus a few Tabler outlines the dump does not hold ----
const sized = (svg, size) => String(svg).replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`).replace(/ class="[^"]*"/, '').replace(/ style="[^"]*"/, ' style="display:block;flex:none"')
const tabler = (paths, size = 16, fill = false) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;flex:none">${paths}</svg>`
const EXTRA = {
  search: '<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/>',
  chevron: '<path d="M6 9l6 6l6 -6"/>',
  right: '<path d="M9 6l6 6l-6 6"/>',
  dots: '<path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
  download: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/>',
  gift: '<path d="M3 8m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z"/><path d="M12 8l0 13"/><path d="M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0 -5a4.800 8 0 0 1 4.500 5a4.800 8 0 0 1 4.500 -5a2.500 2.500 0 0 1 0 5"/>',
  heart: '<path d="M19.500 12.572l-7.500 7.428l-7.500 -7.428a5 5 0 1 1 7.500 -6.566a5 5 0 1 1 7.500 6.572"/>',
  folder: '<path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2"/>',
  cpu: '<path d="M5 5m0 1a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z"/><path d="M9 9h6v6h-6z"/><path d="M3 10h2"/><path d="M3 14h2"/><path d="M10 3v2"/><path d="M14 3v2"/><path d="M21 10h-2"/><path d="M21 14h-2"/><path d="M14 21v-2"/><path d="M10 21v-2"/>',
  drive: '<path d="M3 4m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z"/><path d="M3 12m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z"/><path d="M7 8l0 .01"/><path d="M7 16l0 .01"/>',
  monitor: '<path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10z"/><path d="M7 20h10"/><path d="M9 16v4"/><path d="M15 16v4"/>',
  bolt: '<path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11"/>',
  sparkles: '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/>',
  refresh: '<path d="M20 11a8.100 8.100 0 0 0 -15.500 -2m-.500 -4v4h4"/><path d="M4 13a8.100 8.100 0 0 0 15.500 2m.500 4v-4h-4"/>',
  apps: '<path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M14 7l6 0"/><path d="M17 4l0 6"/>',
  gamepad: '<path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z"/><path d="M6 12h4m-2 -2v4"/><path d="M15 11l0 .01"/><path d="M18 13l0 .01"/>',
  headphones: '<path d="M4 13m0 2a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z"/><path d="M15 13m0 2a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z"/><path d="M4 15v-3a8 8 0 0 1 16 0v3"/>',
  keyboard: '<path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z"/><path d="M6 10l0 .01"/><path d="M10 10l0 .01"/><path d="M14 10l0 .01"/><path d="M18 10l0 .01"/><path d="M6 14l0 .01"/><path d="M18 14l0 .01"/><path d="M10 14l4 .01"/>',
  home: '<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>',
  list: '<path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M5 6l0 .01"/><path d="M5 12l0 .01"/><path d="M5 18l0 .01"/>',
  shuffle: '<path d="M18 4l3 3l-3 3"/><path d="M18 20l3 -3l-3 -3"/><path d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5"/><path d="M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3"/>',
  repeat: '<path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3"/><path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3"/>',
  mic: '<path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M8 21l8 0"/><path d="M12 17l0 4"/>',
  screen: '<path d="M21 12v3a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1h9"/><path d="M7 20l10 0"/><path d="M9 16l0 4"/><path d="M15 16l0 4"/><path d="M17 8l4 -4m-4 0h4v4"/>',
  x: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
  check: '<path d="M5 12l5 5l10 -10"/>',
  plus: '<path d="M12 5l0 14"/><path d="M5 12l14 0"/>',
  usb: '<path d="M12 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M12 15v-11"/><path d="M9 7l3 -3l3 3"/><path d="M12 12l-4 -2v-3"/><path d="M12 14l4 -2v-3"/>',
  battery: '<path d="M6 7h11a2 2 0 0 1 2 2v.5a.5 .5 0 0 0 .5 .5a.5 .5 0 0 1 .5 .5v3a.5 .5 0 0 1 -.5 .5a.5 .5 0 0 0 -.5 .5v.5a2 2 0 0 1 -2 2h-11a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2"/><path d="M7 10l0 4"/><path d="M10 10l0 4"/><path d="M13 10l0 4"/>',
  lock: '<path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z"/><path d="M8 11v-4a4 4 0 1 1 8 0v4"/>',
  volume: '<path d="M15 8a5 5 0 0 1 0 8"/><path d="M17.700 5a9 9 0 0 1 0 14"/><path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.500 -4.500a.800 .800 0 0 1 1.500 .500v14a.800 .800 0 0 1 -1.500 .500l-3.500 -4.500"/>',
  lyrics: '<path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M9 17v-13h10v8"/><path d="M9 8h10"/><path d="M15 19l2 2l4 -4"/>',
}
export function icon(name, size = 16) {
  const from = { library: ICONS.Library, store: ICONS.Store, discord: ICONS.Discord, music: ICONS.Music, pc: ICONS.PC, devices: ICONS.Devices,
    capture: ICONS.capture, settings: ICONS.settings, min: ICONS.window?.[0], max: ICONS.window?.[1], close: ICONS.window?.[2],
    prev: ICONS.mini?.[0], pause: ICONS.mini?.[1], next: ICONS.mini?.[2], note: ICONS.mini?.[3], speaker: ICONS.mini?.[4],
    callmic: ICONS.call?.[0], callphones: ICONS.call?.[1], hangup: ICONS.call?.[2], play: ICONS.play }[name]
  if (from) return sized(from, size)
  if (EXTRA[name]) return tabler(EXTRA[name], size)
  throw new Error('no icon ' + name)
}
/** Exo's mark: the app icon's three bars, in the ink. */
export const mark = (size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 18 18" aria-hidden="true" style="display:block;flex:none"><g fill="currentColor" transform="skewX(-12) translate(2.6 0)"><rect x="2" y="3.2" width="13" height="3" rx="0.6"/><rect x="2" y="7.6" width="8" height="3" rx="0.6"/><rect x="2" y="12" width="13" height="3" rx="0.6"/></g></svg>`

// ---- art: stand-ins for game key art and album covers (no real game's art is used) ----
const PALETTES = [
  ['#ff7a3d', '#1b3a5c', '#0a1220'], ['#c84bff', '#3a1466', '#0d0618'], ['#27d3c3', '#0f3b52', '#04121a'], ['#ff3d5a', '#5a1030', '#150510'],
  ['#9be15d', '#1d4d3a', '#06140f'], ['#ffd166', '#7a3b12', '#170b04'], ['#6ea8ff', '#1e2a6b', '#070a1c'], ['#ff9ad5', '#5b2a6e', '#12071a'],
  ['#f2f2f2', '#3a3f4a', '#0c0d10'], ['#ff5f1f', '#40121e', '#0e0406'], ['#3dd68c', '#0e4a44', '#03120f'], ['#b9a6ff', '#2b2a55', '#0a0a16'],
]
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const rnd = (seed) => { let s = hash(seed) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) }
const ridge = (r, base, rough, n = 9) => `polygon(0% 100%, ${Array.from({ length: n + 1 }, (_, i) => `${Math.round(i * 100 / n)}% ${Math.round(base + (r() - 0.5) * rough)}%`).join(', ')}, 100% 100%)`
/**
 * What stands in a backdrop so it reads as a place, not a gradient: a sun or moon and two ridges, the far one hazy and the
 * near one dark. Everything is in percentages, so the same scene fills a wide hero or a 2:3 cover.
 */
export function scene(seed, pal) {
  const h = hash(seed), [a, b, c] = PALETTES[(pal ?? h) % PALETTES.length], r = rnd(seed + '/scene')
  const x = 22 + Math.round(r() * 56), y = 20 + Math.round(r() * 26), d = 20 + Math.round(r() * 22)
  return `<div style="position: absolute; left: ${x}%; top: ${y}%; height: ${d}%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 999px; background: radial-gradient(circle, #fff 0%, ${a} 38%, ${a}00 72%)"></div>
<div style="position: absolute; inset: 0; clip-path: ${ridge(r, 58, 22)}; background: linear-gradient(to top, ${c} 0%, ${b} 100%); opacity: 0.85"></div>
<div style="position: absolute; inset: 0; clip-path: ${ridge(r, 74, 18, 7)}; background: linear-gradient(to top, #000 0%, ${c} 100%)"></div>`
}
/** A layered, moody backdrop that reads as key art: a light source, a far glow, a ground, a vignette. */
export function art(seed, pal) {
  const h = hash(seed), [a, b, c] = PALETTES[(pal ?? h) % PALETTES.length]
  const x = 18 + (h >> 4) % 64, y = 8 + (h >> 9) % 34, x2 = 100 - x + ((h >> 13) % 20) - 10
  return `background: radial-gradient(60% 55% at ${x}% ${y}%, ${a} 0%, ${a}00 62%), radial-gradient(70% 60% at ${x2}% 78%, ${b} 0%, ${b}00 70%), linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 46%), linear-gradient(${150 + (h % 50)}deg, ${b} 0%, ${c} 70%); background-color: ${c}`
}
/** A 2:3 cover with its title set on it, as a game's box art carries it. */
export function cover(title, { w = 160, dim = false, tag = '', glyph = '', style = '', pal } = {}) {
  const h = Math.round(w * 1.5), size = Math.max(13, Math.round(w / 9.5))
  return `<div style="position: relative; width: ${w}px; height: ${h}px; flex: none; border-radius: 14px; overflow: hidden; ${art(title, pal)}; ${style}">
<div style="position: absolute; inset: 0; ${dim ? 'filter: saturate(0.45) brightness(0.42);' : ''}">${scene(title, pal)}<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 42%)"></div></div>
<div style="position: absolute; left: ${Math.round(w / 13)}px; right: ${Math.round(w / 13)}px; bottom: ${Math.round(w / 12)}px; font-size: ${size}px; line-height: 1.08; font-weight: 700; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.45)">${esc(title)}</div>
${tag ? `<div style="position: absolute; left: 8px; top: 8px; height: 22px; padding: 0 9px; display: flex; align-items: center; border-radius: 999px; font-size: 12px; font-weight: 600; ${PLATE}">${esc(tag)}</div>` : ''}
${glyph ? `<div style="position: absolute; right: 8px; top: 8px; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 999px; ${PLATE}">${icon(glyph, 14)}</div>` : ''}
</div>`
}

// ---- controls ----
export const btn = (label, { primary = false, danger = false, h = 32, ic = '', pad = 12, style = '' } = {}) =>
  `<button style="height: ${h}px; padding: 0 ${pad}px; flex: none; display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 999px; font: ${primary && h >= 40 ? 600 : 500} 13px/1 ${FONT}; cursor: pointer; white-space: nowrap; ${primary ? `background: #fff; color: #000;` : `background: transparent; color: ${danger ? BAD : INK}; ${GLASS};`} ${style}">${ic ? icon(ic, 16) : ''}${esc(label)}</button>`
export const iconBtn = (ic, { size = 32, glyph = 16, glass = true, label = '', style = '' } = {}) =>
  `<button aria-label="${esc(label || ic)}" style="width: ${size}px; height: ${size}px; flex: none; display: grid; place-items: center; border: none; border-radius: 999px; background: transparent; color: ${INK}; cursor: pointer; ${glass ? GLASS + ';' : ''} ${style}">${icon(ic, glyph)}</button>`
export const choice = (label) => `<button style="height: 32px; padding: 0 10px 0 14px; flex: none; display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 999px; background: transparent; color: ${INK}; font: 500 13px/1 ${FONT}; cursor: pointer; ${GLASS}">${esc(label)}<span style="color: ${INK3}">${icon('chevron', 14)}</span></button>`
export const toggle = (on) => `<span role="switch" aria-checked="${on}" style="width: 40px; height: 24px; flex: none; display: block; position: relative; border-radius: 999px; background: ${on ? LIVE : TRACK}"><span style="position: absolute; top: 3px; left: ${on ? 19 : 3}px; width: 18px; height: 18px; border-radius: 999px; background: #fff"></span></span>`
/** A segmented control, as the Rooms are: bare words, the chosen one a white pill. The group has no outline of its own. */
export const segmented = (items, on = 0, { h = 32 } = {}) => `<div role="tablist" style="height: ${h}px; flex: none; display: inline-flex; align-items: center; gap: 2px">${items.map((it, i) => `<span role="tab" style="height: ${h - 4}px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; font-size: 13px; font-weight: ${i === on ? 600 : 500}; ${i === on ? ON : `color: ${INK2}`}">${it}</span>`).join('')}</div>`
export const meter = (share, { tone = INK, w = '100%' } = {}) => `<div style="width: ${w}; height: 4px; border-radius: 999px; background: ${TRACK}; overflow: hidden"><div style="width: ${Math.round(share * 100)}%; height: 100%; border-radius: 999px; background: ${tone}"></div></div>`
export const slider = (share, { w = 120 } = {}) => `<div style="position: relative; width: ${w}px; height: 16px; flex: none"><div style="position: absolute; left: 0; right: 0; top: 6px; height: 4px; border-radius: 999px; background: ${TRACK}"></div><div style="position: absolute; left: 0; width: ${Math.round(share * 100)}%; top: 6px; height: 4px; border-radius: 999px; background: #fff"></div><div style="position: absolute; left: calc(${Math.round(share * 100)}% - 7px); top: 1px; width: 14px; height: 14px; border-radius: 999px; background: #fff"></div></div>`
export const dot = (color = LIVE, size = 8) => `<span style="width: ${size}px; height: ${size}px; flex: none; border-radius: 999px; background: ${color}"></span>`
export const panel = (inner, style = '') => `<section style="${PANEL}; ${style}">${inner}</section>`
/** The one settings row: a name, and state and control on a shared right edge; a hairline above every row but the first. */
export const row = (label, control = '', { first = false, note = '', tone = INK2, icon: ic = '', h = 56 } = {}) => `<div style="min-height: ${h}px; display: flex; align-items: center; gap: 12px; ${first ? '' : 'border-top: ${RULE};'}">${ic ? `<span style="color: ${INK2}; flex: none">${icon(ic, 18)}</span>` : ''}<div style="flex: 1 1 0; min-width: 0"><div style="font-size: 13px; font-weight: 500">${esc(label)}</div>${note ? `<div style="margin-top: 3px; font-size: 13px; color: ${tone}">${esc(note)}</div>` : ''}</div><div style="flex: none; display: flex; align-items: center; gap: 8px">${control}</div></div>`
export const state = (text, on = false) => `<span style="font-size: 13px; color: ${on ? LIVE : INK2}">${esc(text)}</span>`

// ---- the Bar (DESIGN.md › Exo's language): Search, the call or a download, the Rooms, the song, the mouse, Tools ----
const ROOMS = [['library', 'Library'], ['store', 'Store'], ['discord', 'Discord'], ['music', 'Music'], ['pc', 'PC'], ['devices', 'Devices']]
const capsule = (inner, style = '') => `<div style="height: 36px; flex: none; display: flex; align-items: center; border-radius: 999px; ${GLASS}; ${style}">${inner}</div>`
const tools = (inner) => `<div style="height: 36px; flex: none; display: flex; align-items: center; gap: 2px">${inner}</div>`
const bare = (ic, size = 30, glyph = 16, color = INK) => `<span style="width: ${size}px; height: ${size}px; flex: none; display: grid; place-items: center; border-radius: 999px; color: ${color}">${icon(ic, glyph)}</span>`
/**
 * The song, in the size its side of the Bar has room for. full: previous and next, the artist, the heart, the volume.
 * mid: previous and next, the title, the heart. small: pause, the title, the heart.
 */
export function musicMini({ title = 'Midnight Circuit', artist = 'Vela Park', seed = 'Midnight Circuit', share = 0.38, size = 'full' } = {}) {
  const skips = size !== 'small', full = size === 'full'
  return capsule(`${skips ? bare('prev') : ''}${bare('pause')}${skips ? bare('next') : ''}
<span style="position: relative; width: 24px; height: 24px; margin-left: 4px; flex: none; border-radius: 6px; overflow: hidden; ${art(seed, 2)}">${scene(seed, 2)}</span>
<span style="margin-left: 8px; min-width: 0; ${full ? 'width: 176px' : 'width: 104px'}; display: flex; flex-direction: column; gap: 3px"><span style="display: flex; gap: 6px; font-size: 12px; line-height: 14px; white-space: nowrap; overflow: hidden"><b style="font-weight: 600">${esc(title)}</b>${full ? `<span style="color: ${INK2}">${esc(artist)}</span>` : ''}</span>${meter(share)}</span>
<span style="margin-left: 6px">${bare('heart', 30, 16, LIVE)}</span>${full ? bare('speaker') : ''}`, 'padding: 0 6px 0 3px')
}
export function callMini({ place = 'Lounge', server = 'Night Raid', time = '12:07', faces = ['A', 'R', 'M'], speaking = 1 } = {}) {
  const face = (ch, i) => `<span style="width: 22px; height: 22px; margin-left: ${i ? -6 : 0}px; flex: none; display: grid; place-items: center; border-radius: 999px; font-size: 11px; font-weight: 600; background: ${['#3b4a6b', '#6b3b5c', '#3b6b52', '#6b5a3b'][i % 4]}; box-shadow: 0 0 0 2px ${i === speaking ? LIVE : '#000'}">${ch}</span>`
  return capsule(`<span style="margin: 0 8px 0 10px">${dot(LIVE, 8)}</span><span style="display: flex; flex-direction: column; line-height: 14px; font-size: 12px; white-space: nowrap"><b style="font-weight: 600">${esc(place)}</b><span style="color: ${INK2}">${esc(server)}</span></span>
<span style="margin-left: 10px; display: flex">${faces.map(face).join('')}</span><span style="margin: 0 6px 0 10px; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums">${time}</span>${bare('callmic')}${bare('callphones')}${bare('hangup', 30, 16, BAD)}`, 'padding: 0 3px 0 0')
}
export function mouseMini({ profile = 'Valorant', battery = 82, wide = true } = {}) {
  return capsule(`${wide ? `<span style="font-size: 12px; font-weight: 600">${esc(profile)}</span>` : ''}<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums">${icon('battery', 16)}${battery}%</span>`, 'padding: 0 12px; gap: 10px')
}
export function downloadMini({ title = 'Hollow Reach', share = 0.64 } = {}) {
  return capsule(`<span style="margin-left: 10px; color: ${INK2}">${icon('download', 16)}</span><span style="margin-left: 8px; width: 150px; display: flex; flex-direction: column; gap: 3px"><span style="display: flex; justify-content: space-between; font-size: 12px; line-height: 14px"><b style="font-weight: 600">${esc(title)}</b><span style="color: ${INK2}; font-variant-numeric: tabular-nums">${Math.round(share * 100)}%</span></span>${meter(share)}</span>${bare('pause')}`, 'padding: 0 3px 0 0')
}
export function bar({ active = 'library', start = '', end = '', capturing = false, settingsOn = false, wideSearch = false } = {}) {
  const tabs = ROOMS.map(([id, label]) => `<span style="height: 30px; padding: 0 13px; display: flex; align-items: center; gap: 6px; border-radius: 999px; font-size: 13px; font-weight: 600; ${id === active ? ON : `color: ${INK2}`}">${icon(id, 16)}${label}</span>`).join('')
  // Three columns, the middle one the Rooms: they sit at the window's centre whatever is live on either side. As the app
  // has it (owner, 2026-11-10): a call or a download sits left of the Rooms (start), the song and the mouse right of them (end).
  return `<header style="position: relative; z-index: 5; height: 52px; flex: none; padding: 8px ${G}px; box-sizing: border-box; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: ${G}px">
<div style="min-width: 0; display: flex; align-items: center; gap: ${G}px">${wideSearch ? capsule(`${mark(18)}<span style="font-size: 13px; font-weight: 500">Search</span>`, 'width: 200px; padding: 0 12px 0 10px; gap: 10px; box-sizing: border-box') : `<span style="width: 36px; height: 36px; flex: none; display: grid; place-items: center">${mark(18)}</span>`}<span style="flex: 1 1 0"></span>${start}</div>
<nav aria-label="Rooms" style="height: 36px; display: flex; align-items: center; gap: 2px">${tabs}</nav>
<div style="min-width: 0; display: flex; align-items: center; gap: ${G}px">${end}<span style="flex: 1 1 0"></span>${tools(`<span style="position: relative">${bare('capture')}${capturing ? `<span style="position: absolute; right: 5px; top: 5px; width: 6px; height: 6px; border-radius: 999px; background: ${LIVE}"></span>` : ''}</span><span style="border-radius: 999px; ${settingsOn ? ON : ''}">${bare('settings', 30, 16, settingsOn ? '#000' : INK)}</span><span style="width: ${HAIR}; height: 16px; margin: 0 5px; background: ${LINE}"></span>${bare('min')}${bare('max')}${bare('close')}`)}</div>
</header>`
}

// ---- boards ----
export const heading = (text, count = '') => `<h2 style="margin: 0; display: flex; align-items: baseline; gap: 8px; font-size: 20px; line-height: 30px; font-weight: 600">${esc(text)}${count !== '' ? `<span style="font-size: 13px; font-weight: 500; color: ${INK3}">${esc(count)}</span>` : ''}</h2>`
export function board(name, title, inner, { w = 1440, h = 900 } = {}) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Exo Launcher: ${esc(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;background:#000}
:root{--hair:1px}
@media (min-resolution:1.2dppx) and (max-resolution:1.3dppx){:root{--hair:.8px}}
@media (min-resolution:1.45dppx) and (max-resolution:1.55dppx){:root{--hair:.66667px}}
@media (min-resolution:1.7dppx) and (max-resolution:1.8dppx){:root{--hair:.57143px}}
a{color:inherit;text-decoration:none}a:hover{color:inherit}
button{font:inherit}
</style>
</helmet>
<div style="position: relative; width: 100%; height: 100vh; min-height: 720px; display: flex; flex-direction: column; overflow: hidden; background: #000; color: ${INK}; font: 400 13px/1.4 ${FONT}; -webkit-font-smoothing: antialiased">
${inner}
</div>
</x-dc>
<script type="application/json" data-dc-meta>{"$preview":{"width":${w},"height":${h}}}</script>
</body>
</html>
`
  mkdirSync(join(ROOT, 'project'), { recursive: true })
  writeFileSync(join(ROOT, 'project', `${name}.dc.html`), html)
  return name
}
