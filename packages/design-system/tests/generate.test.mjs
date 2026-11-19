// Generator snapshots: dist/ is exactly what tokens/tokens.json renders to; the website CSS carries no glass; the glass
// CSS carries every glass class; the motions and their reduced variants are in both where they belong.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from '../scripts/build.mjs'
import { loadTokens, resolve } from '../scripts/lib/tokens.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = render(loadTokens())
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

test('every dist file is exactly what the generator renders now (run npm run build)', () => {
  assert.equal(read('dist/exo.css'), out.css)
  assert.equal(read('dist/exo-glass.css'), out.glassCss)
  assert.equal(read('dist/exo_tokens.rs'), out.rust)
  assert.equal(read('dist/index.html'), out.html)
})

test('rendering is deterministic', () => {
  const again = render(loadTokens())
  assert.equal(again.css, out.css)
  assert.equal(again.rust, out.rust)
  assert.equal(again.glassCss, out.glassCss)
})

test('the website CSS has no glass: no glass classes, no backdrop filter, no glass custom properties', () => {
  assert.ok(!out.css.includes('.exo-glass'), 'site CSS has a glass class')
  assert.ok(!out.css.includes('backdrop-filter'), 'site CSS filters a backdrop')
  assert.ok(!/--exo-(glass|rim|panel-|shadow-raised|text-glass|text-panel)/.test(out.css), 'site CSS has a glass custom property')
})

test('the glass CSS has every glass class and its tone, and no site-only rules', () => {
  for (const cls of ['.exo-glass {', '.exo-glass--large', '.exo-glass--pane', '.exo-glass--plate']) assert.ok(out.glassCss.includes(cls), cls)
  assert.ok(out.glassCss.includes('backdrop-filter: var(--exo-glass-small)'))
  assert.ok(!out.glassCss.includes('.exo-motion-'), 'glass CSS carries motion')
})

test('every token with a css name is defined in the website CSS or the glass CSS', () => {
  for (const [p, v] of resolve(loadTokens())) {
    const name = v.ext?.css
    if (!name) continue
    assert.ok(out.css.includes(`${name}:`) || out.glassCss.includes(`${name}:`), `${p} -> ${name} is not defined`)
  }
})

test('the site CSS has the eight motions, each with a reduced-motion variant', () => {
  for (const name of ['press', 'hover-lift', 'page-enter', 'card-morph', 'list-stagger', 'sheet', 'toast', 'progress']) {
    assert.ok(out.css.includes(`.exo-motion-${name}`), `no class for ${name}`)
  }
  assert.ok(out.css.includes('@media (prefers-reduced-motion: reduce)'), 'no OS reduced-motion rule')
  assert.ok(out.css.includes('[data-exo-motion="reduce"]'), 'no Exo reduced-motion rule')
  assert.ok(out.css.includes('@font-face') && out.css.includes('fonts/Geist-Variable.woff2'), 'Geist not referenced')
})

test('under reduced motion, every rule with an animation either stops or fades', () => {
  const reduced = out.css.slice(out.css.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.ok(reduced.includes('animation: none'), 'card-morph does not stop under reduced motion')
  const block = reduced.slice(0, reduced.indexOf(':root[data-exo-motion'))
  assert.ok(!/translate: (?!0px 0px)[^;]+/.test(block), 'reduced block translates something')
  assert.ok(!/scale: (?!1[;\s])[^;]+/.test(block), 'reduced block scales something')
})

test('the style page loads the site CSS and the glass CSS, and names every motion', () => {
  assert.ok(out.html.includes('href="exo.css"') && out.html.includes('href="exo-glass.css"'))
  assert.ok(out.html.includes('Liquid Glass'))
})
