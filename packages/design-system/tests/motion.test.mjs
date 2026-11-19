// The named motions: exactly the eight every app uses. Large surfaces spring (damped 0.85, settle 260ms, overshoot at
// most 1%); small controls ease out and never overshoot. Each motion has a reduced variant that never moves anything.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadTokens, resolve } from '../scripts/lib/tokens.mjs'

const t = resolve(loadTokens())
const motions = new Map([...t].filter(([, v]) => v.type === 'motion').map(([p, v]) => [p.replace(/^motion\.named\./, ''), v.value]))
const SPATIAL = new Set(['scale', 'scaleX', 'translateX', 'translateY', 'translateXPercent'])
const BASE = t.get('motion.duration.base').value
const LARGE = ['card-morph', 'page-enter', 'sheet']
const SMALL = ['press', 'hover-lift', 'toast', 'list-stagger', 'progress']

const allChannels = (m) => [...m.channels, ...m.leave, ...(m.loops ?? []), ...(m.scrim ?? [])]

test('exactly the eight named motions, in order', () => {
  assert.deepEqual([...motions.keys()], ['press', 'hover-lift', 'page-enter', 'card-morph', 'list-stagger', 'sheet', 'toast', 'progress'])
})

test('every motion has a reduced-motion variant', () => {
  for (const [name, m] of motions) {
    assert.ok(m.reduced, `${name}: no reduced variant`)
    assert.ok(Array.isArray(m.reduced.channels) && Array.isArray(m.reduced.leave), `${name}: reduced lists missing`)
  }
})

test('reduced motion never slides, grows, springs, flies or loops (DESIGN.md › Reduce)', () => {
  for (const [name, m] of motions) {
    for (const c of [...m.reduced.channels, ...m.reduced.leave]) {
      if (c.duration === 0) continue // an instant change is not motion
      assert.ok(!SPATIAL.has(c.prop), `${name}: reduced ${c.prop} moves over ${c.duration}ms`)
      assert.notEqual(c.curve.type, 'spring', `${name}: reduced variant springs`)
    }
    assert.equal((m.reduced.loops ?? []).length, 0, `${name}: reduced variant loops`)
  }
})

test('reduced durations are never longer than the base time', () => {
  for (const [name, m] of motions) {
    for (const c of [...m.reduced.channels, ...m.reduced.leave]) {
      assert.ok(c.duration <= BASE, `${name}: reduced ${c.duration}ms is longer than base ${BASE}ms`)
    }
  }
})

test('large surfaces spring: damped at 0.85, settle 260ms, and the spring overshoots at most 1%', () => {
  const spring = t.get('motion.curve.spring').value
  assert.equal(spring.type, 'spring')
  assert.ok(spring.value.overshoot > 0 && spring.value.overshoot <= 0.01, `overshoot ${spring.value.overshoot}`)
  for (const name of LARGE) {
    const springs = allChannels(motions.get(name)).filter((c) => c.curve.type === 'spring')
    assert.ok(springs.length > 0, `${name} does not spring`)
    for (const c of springs) assert.equal(c.duration, 260, `${name}: spring over ${c.duration}ms`)
  }
})

test('only the three large surfaces spring (card morph, page enter, sheet)', () => {
  for (const [name, m] of motions) {
    const springs = allChannels(m).filter((c) => c.curve.type === 'spring')
    assert.equal(springs.length > 0, LARGE.includes(name), `${name}: spring use is ${springs.length > 0}`)
  }
})

test('small controls never overshoot: ease-out curves with control points in [0,1]', () => {
  for (const name of SMALL) {
    for (const c of allChannels(motions.get(name))) {
      assert.notEqual(c.curve.type, 'spring', `${name} springs`)
      const [, y1, , y2] = c.curve.value
      assert.ok(y1 >= 0 && y1 <= 1 && y2 >= 0 && y2 <= 1, `${name}: control points leave [0,1] (${y1}, ${y2})`)
    }
  }
})

test('small durations: press 90, hover lift 120, toast 160, list stagger 280 with 24ms steps, progress 300', () => {
  assert.equal(motions.get('press').channels[0].duration, 90)
  assert.equal(motions.get('hover-lift').channels[0].duration, 120)
  assert.equal(motions.get('toast').channels[0].duration, 160)
  const list = motions.get('list-stagger')
  assert.equal(list.channels[0].duration, 280)
  assert.equal(list.stagger, 24)
  assert.equal(list.staggerCap, 7)
  assert.equal(motions.get('progress').channels[0].duration, 300)
})

test('a press gives way to 0.97 and nothing else, and does not give way under reduced motion', () => {
  const press = motions.get('press')
  assert.equal(press.kind, 'state')
  assert.equal(press.trigger, 'active')
  assert.equal(press.channels.length, 1)
  assert.equal(press.channels[0].prop, 'scale')
  assert.equal(press.channels[0].to, 0.97)
  assert.equal(press.channels[0].duration, 90)
  assert.equal(press.leave[0].duration, 120)
  assert.deepEqual(press.reduced.channels, [])
})

test('list stagger: 24ms apart, the eighth and later together', () => {
  const s = motions.get('list-stagger')
  assert.equal(s.stagger, 24)
  assert.equal(s.staggerCap, 7)
  assert.equal(s.reduced.stagger ?? 0, 0)
})

test('a glass sheet settles by its size alone (its glass never fades whole, DESIGN.md › Motion › Appear)', () => {
  const sheet = motions.get('sheet')
  assert.ok(sheet.channels.every((c) => c.prop !== 'opacity'), 'sheet fades its own glass')
})

test('progress: the fill eases out over 300ms; its sheen and glide loop and pause unfocused', () => {
  const p = motions.get('progress')
  assert.equal(p.channels[0].curve.type, 'cubicBezier')
  assert.deepEqual(p.channels[0].curve.value, [0.23, 1, 0.32, 1])
  assert.equal(p.channels[0].duration, 300)
  assert.deepEqual(p.loops.map((l) => l.duration), [1600, 1400])
  assert.equal(p.pauseWhenInactive, true)
})
