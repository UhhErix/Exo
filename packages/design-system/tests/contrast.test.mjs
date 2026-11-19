// WCAG contrast for every text role on the surfaces it is drawn on. The worst case for glass is the art behind it:
// pure white, the brightest backdrop the glass tone has to hold words over (tokens.color.backdrop.worstArt).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadTokens, resolve, contrastRatio, compositeOver, backdropThroughGlass } from '../scripts/lib/tokens.mjs'

const t = resolve(loadTokens())
const get = (p) => {
  const v = t.get(p)
  assert.ok(v, `missing token ${p}`)
  return v.value
}
const ink = (p) => {
  const c = get(p)
  return { r: c.components[0], g: c.components[1], b: c.components[2], a: c.alpha }
}
const VOID = { r: 0, g: 0, b: 0 }
const WORST = ink('color.backdrop.worstArt')
const primary = ink('color.text.primary')
const glassSecondary = ink('color.text.glassSecondary')
const panelSecondary = ink('color.text.panelSecondary')
const muted = ink('color.text.muted')
const faint = ink('color.text.faint')

// Launcher's own E2E thresholds (DESIGN.md › Glass): under 3:1 fails, under 4.5:1 warns. Text meant to read is >= 4.5.
const AA = 4.5
const FAIL_BELOW = 3

test('page text on Void black: primary, muted and faint all pass AA', () => {
  for (const [name, fg] of [['primary', primary], ['muted', muted], ['faint', faint]]) {
    const ratio = contrastRatio(fg, VOID)
    assert.ok(ratio >= AA, `${name} on Void is ${ratio.toFixed(2)}:1`)
  }
})

test('small glass over Void black keeps primary and glass-secondary words at AA', () => {
  const small = backdropThroughGlass(VOID, get('glass.small'))
  for (const [name, fg] of [['primary', primary], ['glassSecondary', glassSecondary]]) {
    const ratio = contrastRatio(fg, small)
    assert.ok(ratio >= AA, `${name} on small glass over Void is ${ratio.toFixed(2)}:1`)
  }
})

test('large glass over the worst art: primary passes AA, panel-secondary clears the fail line', () => {
  const large = backdropThroughGlass(WORST, get('glass.large'))
  assert.ok(contrastRatio(primary, large) >= AA, `primary is ${contrastRatio(primary, large).toFixed(2)}:1`)
  const secondary = contrastRatio(panelSecondary, large)
  assert.ok(secondary >= FAIL_BELOW, `panel-secondary over white art is ${secondary.toFixed(2)}:1, under ${FAIL_BELOW}:1`)
})

test('plate glass (words over art) over the worst art: primary and glass-secondary pass AA', () => {
  const plate = backdropThroughGlass(WORST, get('glass.plate'))
  for (const [name, fg] of [['primary', primary], ['glassSecondary', glassSecondary]]) {
    const ratio = contrastRatio(fg, plate)
    assert.ok(ratio >= AA, `${name} on a plate over white art is ${ratio.toFixed(2)}:1`)
  }
})

test('muted is never used on glass: over the worst art it fails the line (it is a page colour only)', () => {
  const large = backdropThroughGlass(WORST, get('glass.large'))
  assert.ok(contrastRatio(muted, large) < FAIL_BELOW, 'if this passes, the usage rule in DECISIONS.md can be relaxed')
})

test('compositing helper: opaque over opaque is the top colour; 50% over black halves it', () => {
  assert.deepEqual(compositeOver({ r: 1, g: 1, b: 1, a: 1 }, VOID), { r: 1, g: 1, b: 1 })
  const half = compositeOver({ r: 1, g: 1, b: 1, a: 0.5 }, VOID)
  assert.ok(Math.abs(half.r - 0.5) < 1e-9)
})

test('the contrast function matches WCAG: white on black is 21:1', () => {
  assert.ok(Math.abs(contrastRatio({ r: 1, g: 1, b: 1, a: 1 }, VOID) - 21) < 1e-9)
})
