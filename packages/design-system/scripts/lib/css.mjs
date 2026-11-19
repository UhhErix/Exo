// dist/exo.css: the website's CSS (Void black, hairlines, type, spacing, motion, icons). No glass: the owner's call
// (DECISIONS.md). dist/exo-glass.css: the apps' Liquid Glass for HTML prototypes and the style page, separate so the
// site never loads it.
import { resolve } from './tokens.mjs'

const fmt = (n) => String(Number(n.toFixed(6)))
const CSS_PROP = { opacity: 'opacity', scale: 'scale', scaleX: 'scale', translateX: 'translate', translateXPercent: 'translate', translateY: 'translate', brightness: 'filter', flip: 'transform' }
const INVERSE_FLIP = 'translate(var(--exo-flip-x, 0px), var(--exo-flip-y, 0px)) scale(var(--exo-flip-sx, 1), var(--exo-flip-sy, 1))'
// Custom properties that only glass uses: they go to exo-glass.css, never the site.
const GLASS_CSS = new Set([
  '--exo-rim', '--exo-rim-pressed', '--exo-glass-rim-width', '--exo-shadow-raised', '--exo-shadow-color',
  '--exo-shadow-words', '--exo-shadow-words-color', '--exo-panel-hover', '--exo-panel-pressed', '--exo-panel-selected',
  '--exo-text-glass-secondary', '--exo-text-panel-secondary', '--exo-glass-overlay', '--exo-glass-clear',
  '--exo-glass-hover', '--exo-glass-pressed', '--exo-glass-selected', '--exo-glass-small', '--exo-glass-large',
  '--exo-glass-menu', '--exo-glass-pane', '--exo-glass-plate',
])

const cssColor = (c) => (c.alpha === 1 ? c.hex : `rgb(${c.components.map((v) => Math.round(v * 255)).join(' ')} / ${fmt(c.alpha)})`)
const cssCurve = (cv) => (cv.type === 'cubicBezier'
  ? `cubic-bezier(${cv.value.map(fmt).join(', ')})`
  : `linear(${cv.value.points.map((p) => `${fmt(p.v)} ${fmt(p.t * 100)}%`).join(', ')})`)
const cssGlass = (g) => `blur(${fmt(g.blur)}px) brightness(${fmt(g.brightness)}) contrast(${fmt(g.contrast)}) saturate(${fmt(g.saturation)})`
const cssShadow = (s) => `${fmt(s.offsetX)}px ${fmt(s.offsetY)}px ${fmt(s.blur)}px ${fmt(s.spread)}px ${cssColor(s.color)}`
const family = (list) => list.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ')

// The one custom property a token writes, by its type.
function varValue(t) {
  switch (t.type) {
    case 'color': return cssColor(t.value)
    case 'dimension': return `${fmt(t.value)}px`
    case 'duration': return `${fmt(t.value)}ms`
    case 'number': case 'fontWeight': return fmt(t.value)
    case 'fontFamily': return family(t.value)
    case 'cubicBezier': case 'spring': return cssCurve(t.value)
    case 'glass': return cssGlass(t.value)
    case 'shadow': return cssShadow(t.value)
    default: return null
  }
}

// A channel's declaration at one value, for a keyframe.
function keyDecl(c, v) {
  switch (c.prop) {
    case 'opacity': return `opacity: ${fmt(v)}`
    case 'scale': return `scale: ${fmt(v)}`
    case 'scaleX': return `scale: ${fmt(v)} 1`
    case 'translateX': return `translate: ${fmt(v)}px 0px`
    case 'translateXPercent': return `translate: ${fmt(v)}% 0px`
    case 'translateY': return `translate: 0px ${fmt(v)}px`
    case 'brightness': return `filter: brightness(${fmt(v)})`
    case 'flip': return `transform: ${v === 1 ? INVERSE_FLIP : 'none'}`
    default: throw new Error(`no CSS for channel ${c.prop}`)
  }
}

// The values a state motion holds at rest (`which` = from) or at its trigger (`to`), by CSS property.
function stateValues(list, which) {
  const out = {}
  const tr = { x: '0px', y: '0px', on: false }
  for (const c of list) {
    const v = c[which]
    if (c.prop === 'opacity') out.opacity = fmt(v)
    else if (c.prop === 'scale') out.scale = fmt(v)
    else if (c.prop === 'scaleX') out.scale = `${fmt(v)} 1`
    else if (c.prop === 'brightness') out.filter = `brightness(${fmt(v)})`
    else if (c.prop === 'translateX') { tr.x = `${fmt(v)}px`; tr.on = true }
    else if (c.prop === 'translateXPercent') { tr.x = `${fmt(v)}%`; tr.on = true }
    else if (c.prop === 'translateY') { tr.y = `${fmt(v)}px`; tr.on = true }
    else throw new Error(`a state motion cannot animate ${c.prop}`)
  }
  if (tr.on) out.translate = `${tr.x} ${tr.y}`
  return out
}

const RESET = { scale: '1', translate: '0px 0px', filter: 'none', opacity: '1' }
const decl = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ')

function motionRules(t) {
  const durations = new Map()
  const curves = new Map()
  for (const [, tok] of t) {
    if (tok.type === 'duration' && tok.ext.css) durations.set(tok.value, `var(${tok.ext.css})`)
    if ((tok.type === 'cubicBezier' || tok.type === 'spring') && tok.ext.css) curves.set(JSON.stringify(tok.value), `var(${tok.ext.css})`)
  }
  const durVar = (ms) => durations.get(ms) ?? `${fmt(ms)}ms`
  const curveVar = (cv) => curves.get(JSON.stringify(cv)) ?? cssCurve(cv)
  const transitionOf = (list) => {
    const seen = new Map()
    for (const c of list) if (!seen.has(CSS_PROP[c.prop])) seen.set(CSS_PROP[c.prop], `${CSS_PROP[c.prop]} ${durVar(c.duration)} ${curveVar(c.curve)}`)
    return seen.size ? [...seen.values()].join(', ') : 'none'
  }
  const animationOf = (names, list) => list.map((c, i) => `${names}-${i} ${durVar(c.duration)} ${curveVar(c.curve)} both`).join(', ')
  const keyframes = (name, list) => list.map((c, i) => `@keyframes ${name}-${i} { from { ${keyDecl(c, c.from)} } to { ${keyDecl(c, c.to)} } }`)

  const keyframeBlocks = []
  const baseRules = []
  const reduced = [] // [selector, body]
  const motionNames = [...t.keys()].filter((p) => t.get(p).type === 'motion')

  for (const path of motionNames) {
    const name = path.split('.').pop()
    const m = t.get(path).value
    const cls = `.exo-motion-${name}`

    if (m.kind === 'state') {
      const trig = m.trigger === 'hover' ? 'hover' : 'active'
      baseRules.push(`${cls} { ${decl(stateValues(m.channels, 'from'))}; transition: ${transitionOf(m.leave)}; }`)
      baseRules.push(`${cls}:${trig} { ${decl(stateValues(m.channels, 'to'))}; transition: ${transitionOf(m.channels)}; }`)
      const resetFor = (list) => {
        const props = new Set(list.map((c) => CSS_PROP[c.prop]))
        const all = [...m.channels, ...m.leave].map((c) => CSS_PROP[c.prop])
        return Object.fromEntries([...new Set(all)].filter((p) => !props.has(p)).map((p) => [p, RESET[p]]))
      }
      const rr = m.reduced
      reduced.push([cls, `${decl({ ...stateValues(rr.channels, 'from'), ...resetFor(rr.channels) })}; transition: ${transitionOf(rr.leave)}`])
      reduced.push([`${cls}:${trig}`, `${decl({ ...stateValues(rr.channels, 'to'), ...resetFor(rr.channels) })}; transition: ${transitionOf(rr.channels)}`])
      continue
    }

    // An enter motion: keyframes per channel, the class plays them on mount, the leave class plays the leave.
    const enter = (prefix, v) => {
      const names = `exo-${name}${prefix}`
      const props = v.channels.map((c) => CSS_PROP[c.prop])
      if (new Set(props).size !== props.length) throw new Error(`${name}: two channels animate the same CSS property`)
      const out = { keys: [], anim: v.channels.length ? animationOf(names, v.channels) : 'none', leave: null, scrim: null }
      if (v.channels.length) out.keys.push(...keyframes(names, v.channels))
      if (v.leave.length) { out.keys.push(...keyframes(`${names}-leave`, v.leave)); out.leave = animationOf(`${names}-leave`, v.leave) }
      if (v.scrim?.length) { out.keys.push(...keyframes(`${names}-scrim`, v.scrim)); out.scrim = animationOf(`${names}-scrim`, v.scrim) }
      return out
    }
    const full = enter('', m)
    keyframeBlocks.push(...full.keys)
    const stagger = m.stagger !== undefined ? `; animation-delay: calc(min(var(--exo-index, 0), ${m.staggerCap}) * ${durVar(m.stagger)})` : ''
    baseRules.push(`${cls} { animation: ${full.anim}${stagger}; }`)
    if (full.leave) baseRules.push(`${cls}-leave { animation: ${full.leave}; }`)
    if (full.scrim) baseRules.push(`${cls}-scrim { animation: ${full.scrim}; }`)
    m.loops?.forEach((c, i) => {
      const loopName = `exo-${name}-loop-${i}`
      keyframeBlocks.push(...keyframes(loopName, [c]))
      baseRules.push(`${cls}-loop-${i} { animation: ${loopName} ${durVar(c.duration)} ${curveVar(c.curve)} infinite; }`)
      if (m.pauseWhenInactive) baseRules.push(`html[data-exo-inactive="true"] ${cls}-loop-${i} { animation-play-state: paused; }`)
    })

    const r = enter('-r', m.reduced)
    keyframeBlocks.push(...r.keys)
    reduced.push([cls, `animation: ${r.anim}${m.reduced.stagger !== undefined ? '; animation-delay: 0ms' : ''}`])
    if (r.leave) reduced.push([`${cls}-leave`, `animation: ${r.leave}`])
    else if (full.leave) reduced.push([`${cls}-leave`, 'animation: none'])
    if (r.scrim) reduced.push([`${cls}-scrim`, `animation: ${r.scrim}`])
    else if (full.scrim) reduced.push([`${cls}-scrim`, 'animation: none'])
    m.loops?.forEach((_, i) => reduced.push([`${cls}-loop-${i}`, 'animation: none']))
  }

  const reducedRules = reduced.map(([sel, body]) => `${sel} { ${body}; }`)
  const reducedBlock = [
    '@media (prefers-reduced-motion: reduce) {',
    ...reducedRules.map((r) => `  ${r}`),
    '}',
    ...reducedRules.map((r) => `:root[data-exo-motion="reduce"] ${r}`),
  ]
  return [...keyframeBlocks, ...baseRules, '', ...reducedBlock]
}

function header(what) {
  return [`/* Exo design system: ${what}. Generated from tokens/tokens.json by scripts/build.mjs. Do not edit. */`]
}

export function renderCss(tree) {
  const t = resolve(tree)
  const siteVars = []
  const glassVars = []
  for (const [, tok] of t) {
    const value = tok.ext.css && varValue(tok)
    if (!value) continue
    const line = `  ${tok.ext.css}: ${value};`
    if (tok.type === 'glass' || GLASS_CSS.has(tok.ext.css)) glassVars.push(line)
    else siteVars.push(line)
  }

  const site = [
    ...header('the website (no glass)'),
    '@font-face {',
    '  font-family: "Geist";',
    '  src: url("fonts/Geist-Variable.woff2") format("woff2");',
    '  font-weight: 100 900;',
    '  font-display: swap;',
    '}',
    '',
    ':root {',
    '  color-scheme: dark;',
    '  --exo-scale: 1;',
    ...siteVars,
    '}',
    '',
    '/* Pure Void black, hairlines, solid buttons: the look of the site. */',
    '.exo-page { background: var(--exo-void); color: var(--exo-text); font-family: var(--exo-font-sans); }',
    ':focus-visible { outline: 2px solid var(--exo-accent); outline-offset: 2px; }',
    ...[...t].filter(([p, tok]) => p.startsWith('radius.') && tok.ext.css).map(([p, tok]) => `.exo-radius-${p.split('.')[1]} { border-radius: var(${tok.ext.css}); }`),
    ...[...t].filter(([p, tok]) => p.startsWith('type.size.') && tok.ext.css).map(([p]) => `.exo-type-${p.split('.')[2]} { font-size: var(${t.get(p).ext.css}); }`),
    ...[...t].filter(([p, tok]) => p.startsWith('type.weight.') && tok.ext.css).map(([p, tok]) => `.exo-weight-${p.split('.')[2]} { font-weight: var(${tok.ext.css}); }`),
    '.exo-font-sans { font-family: var(--exo-font-sans); }',
    '.exo-font-mono { font-family: var(--exo-font-mono); }',
    '.exo-tabular { font-variant-numeric: tabular-nums; }',
    '.exo-icon {',
    '  width: var(--exo-icon-size-row);',
    '  height: var(--exo-icon-size-row);',
    '  fill: none;',
    '  stroke: currentColor;',
    '  stroke-width: var(--exo-icon-stroke);',
    '  stroke-linecap: round;',
    '  stroke-linejoin: round;',
    '}',
    '.exo-icon--control { width: var(--exo-icon-size-control); height: var(--exo-icon-size-control); }',
    '.exo-icon--large { width: var(--exo-icon-size-large); height: var(--exo-icon-size-large); }',
    '',
    '/* Motion: state motions transition, enter motions play their keyframes. Reduced motion never moves anything. */',
    ...motionRules(t),
    '',
  ].join('\n')

  const glass = [
    ...header('the apps\' Liquid Glass (HTML prototypes and the style page only; the website never loads it)'),
    ':root {',
    ...glassVars,
    '}',
    '',
    '/* Liquid Glass: clear and toned over what is behind, inside one even line. Small glass casts no shadow. */',
    '.exo-glass {',
    '  position: relative;',
    '  background-color: var(--exo-glass-clear);',
    '  backdrop-filter: var(--exo-glass-small);',
    '  box-shadow: inset 0 0 0 var(--exo-glass-rim-width) var(--exo-rim);',
    '}',
    '.exo-glass:hover { background-color: var(--exo-glass-hover); }',
    '.exo-glass:active { background-color: var(--exo-glass-pressed); }',
    '/* Large glass floats: the overlay over a thicker blur, a raised shadow, the same one line. */',
    '.exo-glass--large, .exo-glass--menu {',
    '  position: relative;',
    '  background-color: var(--exo-glass-overlay);',
    '  backdrop-filter: var(--exo-glass-large);',
    '  box-shadow: var(--exo-shadow-raised), inset 0 0 0 var(--exo-glass-rim-width) var(--exo-rim);',
    '}',
    '.exo-glass--large:hover, .exo-glass--menu:hover { background-image: linear-gradient(var(--exo-panel-hover), var(--exo-panel-hover)); }',
    '.exo-glass--large:active, .exo-glass--menu:active { background-image: linear-gradient(var(--exo-panel-pressed), var(--exo-panel-pressed)); }',
    '.exo-glass--pane { position: relative; backdrop-filter: var(--exo-glass-pane); box-shadow: inset 0 0 0 var(--exo-glass-rim-width) var(--exo-rim); }',
    '.exo-glass--plate { position: relative; backdrop-filter: var(--exo-glass-plate); box-shadow: inset 0 0 0 var(--exo-glass-rim-width) var(--exo-rim); }',
    '',
  ].join('\n')

  return { site, glass }
}
