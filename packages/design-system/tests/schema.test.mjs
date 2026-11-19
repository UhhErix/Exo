// Token schema: every leaf is typed, every reference resolves, values are in range, and the spring is the one curve
// allowed to overshoot (large surfaces, at most 1%).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadTokens, flatten, refsIn, resolve, hexOf } from '../scripts/lib/tokens.mjs'

const raw = loadTokens()
const leaves = flatten(raw)
const TYPES = new Set(['color', 'dimension', 'duration', 'cubicBezier', 'fontFamily', 'fontWeight', 'number', 'shadow', 'glass', 'spring', 'motion'])
const SCREAMING = /^[A-Z][A-Z0-9_]*$/
const CSS_VAR = /^--exo-[a-z0-9-]+$/

test('every leaf has a known $type and a $value', () => {
  assert.ok(leaves.size > 80, `only ${leaves.size} tokens`)
  for (const [p, leaf] of leaves) {
    assert.ok(TYPES.has(leaf.$type), `${p}: unknown $type ${leaf.$type}`)
    assert.ok('$value' in leaf, `${p}: no $value`)
  }
})

test('every reference points at a token that exists', () => {
  for (const [p, leaf] of leaves) {
    for (const ref of refsIn(leaf.$value)) assert.ok(leaves.has(ref), `${p} refers to {${ref}}, which does not exist`)
  }
})

test('references resolve without a cycle', () => {
  assert.doesNotThrow(() => resolve(raw))
})

test('colors: sRGB components in [0,1], alpha in [0,1], hex matches the components', () => {
  const resolved = resolve(raw)
  for (const [p, t] of resolved) {
    if (t.type !== 'color') continue
    const c = t.value
    assert.equal(c.colorSpace, 'srgb', p)
    assert.equal(c.components.length, 3, p)
    for (const v of c.components) assert.ok(v >= 0 && v <= 1, `${p} component ${v}`)
    assert.ok(c.alpha >= 0 && c.alpha <= 1, `${p} alpha ${c.alpha}`)
    if (c.hex) assert.equal(c.hex, hexOf(c.components), p)
  }
})

test('durations are non-negative milliseconds, dimensions are px', () => {
  for (const [p, leaf] of leaves) {
    if (leaf.$type === 'duration') assert.equal(leaf.$value.unit, 'ms', p)
    if (leaf.$type === 'duration') assert.ok(leaf.$value.value >= 0, p)
    if (leaf.$type === 'dimension') assert.equal(leaf.$value.unit, 'px', p)
  }
})

test('cubic-bezier: four numbers, x between 0 and 1 (CSS requires it)', () => {
  for (const [p, leaf] of leaves) {
    if (leaf.$type !== 'cubicBezier') continue
    const [x1, y1, x2, y2] = leaf.$value
    assert.equal(leaf.$value.length, 4, p)
    assert.ok(x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1, `${p}: x out of [0,1]`)
    assert.ok([y1, y2].every(Number.isFinite), p)
  }
})

test('spring: starts at rest, ends on target, and overshoots at most 1% (large surfaces only)', () => {
  let springs = 0
  for (const [p, leaf] of leaves) {
    if (leaf.$type !== 'spring') continue
    springs++
    const pts = leaf.$value.points
    assert.equal(pts[0].t, 0, `${p} starts at t=${pts[0].t}`)
    assert.equal(pts[0].v, 0, `${p} starts at v=${pts[0].v}`)
    assert.equal(pts.at(-1).t, 1, `${p} ends at t=${pts.at(-1).t}`)
    assert.equal(pts.at(-1).v, 1, `${p} ends at v=${pts.at(-1).v}`)
    for (let i = 1; i < pts.length; i++) assert.ok(pts[i].t > pts[i - 1].t, `${p}: t not increasing at ${i}`)
    const peak = Math.max(...pts.map((q) => q.v))
    assert.ok(peak <= 1.01, `${p} overshoots ${((peak - 1) * 100).toFixed(2)}%`)
    assert.ok(Math.abs(peak - 1 - leaf.$value.overshoot) < 2e-3, `${p}: recorded overshoot ${leaf.$value.overshoot} differs from the table`)
    assert.equal(leaf.$value.settle, 260, `${p} settles in ${leaf.$value.settle}ms, not 260`)
    assert.equal(leaf.$value.damping, 0.85, `${p} damping ${leaf.$value.damping}`)
  }
  assert.equal(springs, 1)
})

test('extension names are unique and well formed (Rust consts, CSS custom properties)', () => {
  const rust = new Map()
  const css = new Map()
  for (const [p, leaf] of leaves) {
    const ext = leaf.$extensions?.exo ?? {}
    if (ext.rust) {
      assert.match(ext.rust, SCREAMING, `${p}: rust name ${ext.rust}`)
      assert.ok(!rust.has(ext.rust), `${p}: rust name ${ext.rust} also on ${rust.get(ext.rust)}`)
      rust.set(ext.rust, p)
    }
    if (ext.css) {
      assert.match(ext.css, CSS_VAR, `${p}: css name ${ext.css}`)
      assert.ok(!css.has(ext.css), `${p}: css name ${ext.css} also on ${css.get(ext.css)}`)
      css.set(ext.css, p)
    }
  }
  assert.ok(rust.size >= 60, `only ${rust.size} rust names`)
})

test('every motion is typed: kind, channels, and a reduced variant with both lists', () => {
  const resolved = resolve(raw)
  for (const [p, t] of resolved) {
    if (t.type !== 'motion') continue
    assert.ok(['enter', 'state'].includes(t.value.kind), `${p}: kind ${t.value.kind}`)
    assert.ok(Array.isArray(t.value.channels) && t.value.channels.length > 0, `${p}: no channels`)
    assert.ok(Array.isArray(t.value.leave), `${p}: no leave channels`)
    assert.ok(t.value.reduced && Array.isArray(t.value.reduced.channels) && Array.isArray(t.value.reduced.leave), `${p}: no reduced variant`)
    if (t.value.kind === 'state') assert.ok(['hover', 'active'].includes(t.value.trigger), `${p}: state needs a trigger`)
    for (const c of [...t.value.channels, ...t.value.leave]) {
      assert.ok(Number.isFinite(c.duration) && c.duration >= 0, `${p}: duration ${c.duration}`)
      assert.ok(c.curve && (c.curve.type === 'cubicBezier' || c.curve.type === 'spring'), `${p}: curve`)
    }
  }
})
