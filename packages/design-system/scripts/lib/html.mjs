// dist/index.html: the living style page. Every token table is rendered from tokens/tokens.json; the samples use only
// dist/exo.css's classes and the custom properties. Each named motion is playable and honours Reduce motion through CSS.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from './tokens.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ICONS = path.resolve(here, '../../icons')
const ICON_NAMES = ['check', 'play', 'search', 'settings', 'bell', 'heart', 'plus', 'download', 'chevron-right', 'music']

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const fmt = (n) => String(Number(n.toFixed(6)))
const hexOf = (c) => (c.alpha === 1 ? c.hex : `rgb(${c.components.map((v) => Math.round(v * 255)).join(' ')} / ${fmt(c.alpha)})`)

function icon(name, cls = '') {
  const svg = fs.readFileSync(path.join(ICONS, `${name}.svg`), 'utf8')
  return svg.replace('<svg ', `<svg class="exo-icon ${cls}" aria-hidden="true" `).replace(/\s+stroke="#000"/, '')
}

function describe(tok) {
  switch (tok.type) {
    case 'color': return hexOf(tok.value)
    case 'dimension': return `${fmt(tok.value)}px`
    case 'duration': return `${fmt(tok.value)}ms`
    case 'number': case 'fontWeight': return fmt(tok.value)
    case 'fontFamily': return tok.value.join(', ')
    case 'cubicBezier': return `cubic-bezier(${tok.value.value.map(fmt).join(', ')})`
    case 'spring': return `damped spring, damping ${tok.value.value.damping}, settles in ${tok.value.value.settle} ms, overshoot ${(tok.value.value.overshoot * 100).toFixed(2)}%`
    case 'glass': return `blur ${tok.value.blur}px, brightness ${tok.value.brightness}, saturate ${tok.value.saturation}`
    case 'shadow': return `${tok.value.blur.value ?? tok.value.blur}px blur`
    default: return ''
  }
}

function tokenTable(t, prefix, title) {
  const rows = [...t].filter(([p]) => p.startsWith(prefix + '.') && !p.includes('.named.'))
  if (!rows.length) return ''
  return `<section><h2>${esc(title)}</h2><table class="tbl"><thead><tr><th>Token</th><th>Value</th><th>CSS</th><th>Rust</th></tr></thead><tbody>${rows
    .map(([p, tok]) => `<tr><td><code>${esc(p)}</code></td><td>${esc(describe(tok))}</td><td><code>${esc(tok.ext.css ?? '')}</code></td><td><code>${esc(tok.ext.rust ?? '')}</code></td></tr>`)
    .join('')}</tbody></table></section>`
}

function swatches(t) {
  const colors = [...t].filter(([p, tok]) => tok.type === 'color' && tok.ext.css)
  return `<section><h2>Colour</h2><p class="lede">Void black is the page. Everything on it is glass. Ink is white at an alpha, so one value holds on any backdrop.</p><div class="swatches">${colors
    .map(([p, tok]) => `<div class="swatch"><div class="chip" style="background: var(${tok.ext.css})"></div><div><code>${esc(p)}</code><br>${esc(hexOf(tok.value))}</div></div>`)
    .join('')}</div></section>`
}

function glassSamples() {
  const backdrop = 'background: linear-gradient(120deg, #ff6b4a 0%, #3b5bdb 40%, #20c997 70%, #f8f9fa 100%)'
  return `<section><h2>Liquid Glass</h2><p class="lede">Clear and toned over what is behind, one even line round it. Each sits on the same bright backdrop.</p>
  <div class="glass-grid" style="${backdrop}">
    <div class="glass-sample exo-glass" style="border-radius: var(--exo-radius-card)"><b>Small</b><span>Controls, capsules, the mini player.</span></div>
    <div class="glass-sample exo-glass exo-glass--large" style="border-radius: var(--exo-radius-panel)"><b>Large</b><span>Sheets, notices, popovers, the overlay and a raised shadow.</span></div>
    <div class="glass-sample exo-glass exo-glass--menu" style="border-radius: var(--exo-radius-card)"><b>Menu</b><span>A menu is large glass; its rows lift 34px.</span></div>
    <div class="glass-sample exo-glass exo-glass--pane" style="border-radius: var(--exo-radius-panel)"><b>Pane</b><span>A side panel under its content.</span></div>
    <div class="glass-sample exo-glass exo-glass--plate" style="border-radius: var(--exo-radius-card)"><b>Plate</b><span>Words over art: the art held down further.</span></div>
  </div></section>`
}

function typeScale() {
  return `<section><h2>Type</h2><p class="lede">Geist, three sizes for most of the app: 20 titles, 13 body and controls, 12 small. Controls are medium; section names and titles are semibold.</p>
  <div class="type">
    <div class="exo-type-title exo-weight-title">Title 20 semibold</div>
    <div class="exo-type-page exo-weight-title">Page 28</div>
    <div class="exo-type-body exo-weight-control">Control 13 medium</div>
    <div class="exo-type-body">Body 13 regular, what the row says.</div>
    <div class="exo-type-small exo-weight-control">Small 12 medium</div>
    <div class="exo-type-label exo-weight-control">Label 10 medium</div>
    <div class="exo-type-body exo-tabular">Tabular 0123456789 111 111</div>
  </div></section>`
}

function controls() {
  return `<section><h2>Controls</h2><p class="lede">Buttons, a field, a switch and a card, built from the same glass and motion tokens.</p>
  <div class="controls">
    <button class="btn btn--primary exo-motion-press" type="button">Primary</button>
    <button class="btn exo-glass exo-motion-press" type="button">Secondary</button>
    <button class="btn btn--quiet exo-motion-press" type="button">Quiet</button>
    <label class="field exo-glass"><span class="exo-icon exo-icon--control">${icon('search')}</span><input type="text" placeholder="Search" aria-label="Search sample"></label>
    <button class="switch" role="switch" aria-checked="true" type="button" aria-label="Sample switch"><span class="switch__thumb"></span></button>
  </div>
  <div class="cards">
    <article class="card exo-glass exo-glass--large exo-motion-hover-lift">
      <h3>Card</h3><p>A card is 14px, the glass of a menu. A cover lifts 3px on hover.</p>
      <div class="rows"><div class="row"><span>Row</span><span class="exo-icon">${icon('chevron-right')}</span></div><div class="row"><span>Second row</span><span class="exo-icon">${icon('download')}</span></div></div>
    </article>
    <article class="cover exo-motion-hover-lift" aria-label="Sample cover"><div class="cover__art"></div><span>Cover</span></article>
  </div></section>`
}

function icons() {
  return `<section><h2>Icons</h2><p class="lede">Tabler outline, a 1.875 line on its 24 grid: 1.25px at 16px, so it reads as the 13px labels do.</p>
  <div class="icons">${ICON_NAMES.map((n) => `<figure>${icon(n)}<figcaption>${esc(n)}</figcaption></figure>`).join('')}</div></section>`
}

function motionSpecs(t) {
  const rows = [...t].filter(([p, tok]) => tok.type === 'motion').map(([p, tok]) => {
    const m = tok.value
    const chans = [...m.channels, ...(m.loops ?? [])].map((c) => `${c.prop} ${fmt(c.from)}→${fmt(c.to)} · ${fmt(c.duration)}ms`).join('; ')
    const red = [...m.reduced.channels, ...m.reduced.leave].length ? [...m.reduced.channels, ...m.reduced.leave].map((c) => `${c.prop} (${fmt(c.duration)}ms)`).join(', ') : 'no motion, the change lands at once'
    return `<tr><td><code>${esc(p.split('.').pop())}</code></td><td>${esc(m.kind)}${m.trigger ? ` · on ${esc(m.trigger)}` : ''}</td><td>${esc(chans)}</td><td>${esc(red)}</td></tr>`
  })
  return `<section><h2>Motion</h2><p class="lede">Eight named motions, each playable below. Two curves: what appears eases out; what travels or changes shape springs (damped, never overshoots). Under Reduce motion nothing slides, grows, springs or loops.</p>
  <table class="tbl"><thead><tr><th>Motion</th><th>Kind</th><th>Channels (property, from→to, duration)</th><th>Reduced</th></tr></thead><tbody>${rows.join('')}</tbody></table>
  <div class="demos">
    <div class="demo"><h3>Page enter</h3><div class="demo__stage"><div id="room" class="room exo-glass exo-glass--large"><b>A room</b><span>Fades in and slides 12px.</span></div></div><button class="btn" data-replay="room" data-cls="exo-motion-page-enter" type="button">Replay</button></div>
    <div class="demo"><h3>Card morph</h3><div class="demo__stage"><div id="morph" class="morph exo-glass exo-glass--large"></div></div><button class="btn" id="morph-btn" type="button">Resize</button></div>
    <div class="demo"><h3>List stagger</h3><div class="demo__stage"><ul id="list" class="list">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<li class="row exo-glass">Item ${i}</li>`).join('')}</ul></div><button class="btn" data-replay-list="list" type="button">Replay</button></div>
    <div class="demo"><h3>Sheet</h3><div class="demo__stage"><div id="scrim" class="scrim" hidden></div><div id="sheet" class="sheet exo-glass exo-glass--large" hidden><b>A sheet</b><span>Settles from the middle; closes at the quick time.</span></div></div><button class="btn" id="sheet-btn" type="button">Open</button></div>
    <div class="demo"><h3>Toast</h3><div class="demo__stage"><div id="toast" class="toast exo-glass exo-glass--large" hidden><span class="exo-icon">${icon('bell')}</span> Download finished</div></div><button class="btn" id="toast-btn" type="button">Show</button></div>
    <div class="demo"><h3>Progress</h3><div class="demo__stage"><div class="bar"><div id="bar-fill" class="bar__fill"></div><div class="bar__sheen exo-motion-progress-loop-0"></div></div></div><button class="btn" id="bar-btn" type="button">Run</button></div>
    <div class="demo"><h3>Press</h3><div class="demo__stage"><button class="btn btn--primary exo-motion-press" type="button">Press and hold</button></div><span class="hint">0.97 on press, back on release.</span></div>
  </div></section>`
}

const SCRIPT = `
const root = document.documentElement
const cssVar = (n) => getComputedStyle(root).getPropertyValue(n).trim()
const ms = (v) => parseFloat(v) || 0
const still = () => root.dataset.exoMotion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches
const replay = (el, cls) => { el.classList.remove('exo-motion-page-enter','exo-motion-list-stagger','exo-motion-toast','exo-motion-sheet','exo-motion-sheet-scrim','exo-motion-toast-leave','exo-motion-sheet-leave'); void el.offsetWidth; el.classList.add(cls) }
document.querySelectorAll('[data-replay]').forEach((b) => b.addEventListener('click', () => replay(document.getElementById(b.dataset.replay), b.dataset.cls)))
document.querySelectorAll('[data-replay-list]').forEach((b) => b.addEventListener('click', () => {
  const list = document.getElementById(b.dataset.replayList)
  ;[...list.children].forEach((li, i) => { li.style.setProperty('--exo-index', i); li.classList.remove('exo-motion-list-stagger'); void li.offsetWidth; li.classList.add('exo-motion-list-stagger') })
}))
const morph = document.getElementById('morph')
let big = false
document.getElementById('morph-btn').addEventListener('click', () => {
  const first = morph.getBoundingClientRect()
  big = !big
  morph.classList.toggle('is-big', big)
  const last = morph.getBoundingClientRect()
  if (still()) return
  morph.animate([
    { transform: 'translate(' + (first.left - last.left) + 'px,' + (first.top - last.top) + 'px) scale(' + (first.width / last.width) + ',' + (first.height / last.height) + ')' },
    { transform: 'none' },
  ], { duration: ms(cssVar('--exo-dur-move')), easing: cssVar('--exo-ease-spring') })
})
const sheet = document.getElementById('sheet'), scrim = document.getElementById('scrim'), sheetBtn = document.getElementById('sheet-btn')
let open = false
sheetBtn.addEventListener('click', () => {
  open = !open
  if (open) { sheet.hidden = false; scrim.hidden = false; replay(sheet, 'exo-motion-sheet'); replay(scrim, 'exo-motion-sheet-scrim'); sheetBtn.textContent = 'Close' }
  else { sheet.classList.remove('exo-motion-sheet'); sheet.classList.add('exo-motion-sheet-leave'); scrim.hidden = true; sheetBtn.textContent = 'Open'; setTimeout(() => { sheet.hidden = true }, ms(cssVar('--exo-dur-quick'))) }
})
const toast = document.getElementById('toast')
document.getElementById('toast-btn').addEventListener('click', () => {
  toast.hidden = false; toast.classList.remove('exo-motion-toast-leave'); replay(toast, 'exo-motion-toast')
  setTimeout(() => { toast.classList.remove('exo-motion-toast'); toast.classList.add('exo-motion-toast-leave') }, ms(cssVar('--exo-dur-hold')))
})
const fill = document.getElementById('bar-fill')
document.getElementById('bar-btn').addEventListener('click', () => { fill.classList.remove('exo-motion-progress'); void fill.offsetWidth; fill.classList.add('exo-motion-progress') })
`

export function renderHtml(tree, css) {
  const t = resolve(tree)
  return `<!doctype html>
<html lang="en" data-exo-motion="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Exo design system</title>
<link rel="stylesheet" href="exo.css">
<link rel="stylesheet" href="exo-glass.css">
<style>
  body { margin: 0; min-height: 100vh; padding: 0 var(--exo-space-4xl) var(--exo-space-4xl); }
  main { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: var(--exo-size-first-run); font-weight: var(--exo-weight-title); margin: 48px 0 8px; }
  h2 { font-size: var(--exo-size-title); font-weight: var(--exo-weight-title); margin: 56px 0 12px; border-top: 1px solid var(--exo-hairline); padding-top: 24px; }
  h3 { font-size: var(--exo-size-body); font-weight: var(--exo-weight-title); margin: 0 0 12px; }
  .lede { color: var(--exo-text-muted); font-size: var(--exo-size-body); max-width: 70ch; margin: 0 0 20px; }
  code { font-family: var(--exo-font-mono); font-size: var(--exo-size-small); color: var(--exo-text-muted); }
  .tbl { width: 100%; border-collapse: collapse; font-size: var(--exo-size-small); }
  .tbl th, .tbl td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--exo-hairline); vertical-align: top; }
  .tbl th { color: var(--exo-text-muted); font-weight: var(--exo-weight-control); }
  .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .swatch { display: flex; gap: 12px; align-items: center; font-size: var(--exo-size-small); }
  .chip { width: 44px; height: 44px; border-radius: var(--exo-radius-card); box-shadow: inset 0 0 0 1px var(--exo-hairline); flex: none; }
  .glass-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; padding: 24px; border-radius: var(--exo-radius-panel); }
  .glass-sample { padding: 20px; display: grid; gap: 6px; min-height: 120px; align-content: start; }
  .glass-sample span { font-size: var(--exo-size-small); color: var(--exo-text-glass-secondary); }
  .glass-sample b { font-weight: var(--exo-weight-control); }
  .type { display: grid; gap: 14px; }
  .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .btn { height: var(--exo-size-control); padding: 0 16px; border: 0; border-radius: var(--exo-radius-pill); background: transparent; color: var(--exo-text); font: inherit; font-size: var(--exo-size-body); font-weight: var(--exo-weight-control); cursor: pointer; }
  .btn--primary { background: var(--exo-accent); color: var(--exo-accent-fg); }
  .btn--primary:hover { background: var(--exo-accent-hover); }
  .btn--quiet:hover { background: var(--exo-hover); }
  button.exo-glass { color: var(--exo-text-glass-secondary); }
  .field { display: inline-flex; align-items: center; gap: 8px; height: var(--exo-size-control); padding: 0 12px; border-radius: var(--exo-radius-pill); }
  .field input { background: transparent; border: 0; color: var(--exo-text); font: inherit; font-size: var(--exo-size-body); outline: none; width: 180px; }
  .switch { position: relative; width: var(--exo-size-switch-w); height: var(--exo-size-switch-h); border: 0; border-radius: var(--exo-radius-pill); background: var(--exo-track); padding: 0; cursor: pointer; }
  .switch[aria-checked="true"] { background: var(--exo-accent); }
  .switch__thumb { position: absolute; top: 5px; left: 5px; width: var(--exo-size-knob); height: var(--exo-size-knob); border-radius: 50%; background: var(--exo-accent-fg); transition: translate var(--exo-dur-move) var(--exo-ease-spring); }
  .switch[aria-checked="true"] .switch__thumb { translate: 16px 0; }
  .cards { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 24px; align-items: flex-start; }
  .card { width: 300px; padding: 20px; border-radius: var(--exo-radius-card); }
  .card p { color: var(--exo-text-panel-secondary); font-size: var(--exo-size-small); margin: 0 0 12px; }
  .rows .row { display: flex; justify-content: space-between; align-items: center; height: var(--exo-size-menu-row); border-top: 1px solid var(--exo-hairline); font-size: var(--exo-size-body); }
  .cover { width: 150px; }
  .cover__art { height: 200px; border-radius: var(--exo-radius-panel); background: linear-gradient(160deg, #3b5bdb, #111); }
  .cover span { display: block; margin-top: 8px; font-size: var(--exo-size-small); }
  .icons { display: flex; flex-wrap: wrap; gap: 20px; }
  .icons figure { margin: 0; display: grid; justify-items: center; gap: 6px; color: var(--exo-text-muted); font-size: var(--exo-size-small); }
  .icons .exo-icon { width: 24px; height: 24px; color: var(--exo-text); }
  .demos { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; margin-top: 24px; }
  .demo { display: grid; gap: 12px; align-content: start; }
  .demo__stage { position: relative; height: 160px; border-radius: var(--exo-radius-card); background: var(--exo-void-raised); overflow: hidden; display: grid; place-items: center; }
  .room { padding: 16px 20px; border-radius: var(--exo-radius-panel); display: grid; gap: 4px; }
  .room span { font-size: var(--exo-size-small); color: var(--exo-text-panel-secondary); }
  .morph { width: 120px; height: 70px; border-radius: var(--exo-radius-card); }
  .morph.is-big { width: 220px; height: 130px; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; width: 100%; }
  .list .row { padding: 6px 12px; border-radius: var(--exo-radius-row); font-size: var(--exo-size-body); }
  .scrim { position: absolute; inset: 0; background: var(--exo-scrim); }
  .sheet { position: absolute; left: 12px; right: 12px; top: 12px; padding: 16px; border-radius: var(--exo-radius-sheet); display: grid; gap: 4px; }
  .sheet span { font-size: var(--exo-size-small); color: var(--exo-text-panel-secondary); }
  .toast { position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 12px 14px; border-radius: var(--exo-radius-panel); font-size: var(--exo-size-body); display: flex; gap: 8px; align-items: center; }
  .bar { position: relative; width: 80%; height: var(--exo-size-progress-l); border-radius: var(--exo-radius-pill); background: var(--exo-track); overflow: hidden; }
  .bar__fill { position: absolute; inset: 0; border-radius: inherit; background: var(--exo-accent); transform-origin: left center; }
  .bar__sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 30%; background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.35), transparent); }
  .hint { font-size: var(--exo-size-small); color: var(--exo-text-muted); }
  .exo-motion-progress { animation: exo-progress-0 var(--exo-dur-move) var(--exo-ease-linear) both; }
</style>
</head>
<body class="exo-page">
<main>
  <h1>Exo design system</h1>
  <p class="lede">One source for the look of every Exo app: <code>tokens/tokens.json</code> renders <code>exo.css</code> for the web and <code>exo_tokens.rs</code> for GPUI. This page is generated from the same tokens.</p>
  ${swatches(t)}
  ${glassSamples()}
  ${typeScale()}
  ${controls()}
  ${icons()}
  ${motionSpecs(t)}
  ${tokenTable(t, 'radius', 'Radius')}
  ${tokenTable(t, 'space', 'Spacing')}
  ${tokenTable(t, 'size', 'Sizes')}
  ${tokenTable(t, 'breakpoint', 'Breakpoints')}
  ${tokenTable(t, 'z', 'Z-index')}
  ${tokenTable(t, 'glass', 'Glass tones')}
  ${tokenTable(t, 'shadow', 'Shadows')}
  ${tokenTable(t, 'icon', 'Icon')}
</main>
<script>
${SCRIPT}
</script>
</body>
</html>
`
}
