// dist/exo_tokens.rs compiles and its own unit tests pass, against a stand-in for gpui::Rgba (the real crate is not
// built here). It also keeps every const name exo-ui-kit's exo-design/src/tokens.rs exports today, with the same type,
// so the swap is a file replacement.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rustFile = path.join(root, 'dist/exo_tokens.rs')
const src = fs.readFileSync(rustFile, 'utf8')

// Names and types in exo-ui-kit/crates/exo-design/src/tokens.rs (branch spike/gpui-pre-0.3.11) that call sites use.
const REQUIRED = {
  Rgba: ['VOID', 'FG', 'MUTED', 'FAINT', 'LINE', 'LINE_SOFT', 'HAIRLINE', 'CONTROL_LINE', 'TILE', 'SOLID', 'GOOD', 'WARN', 'BAD',
    'PRIMARY', 'PRIMARY_FG', 'PRIMARY_HOVER', 'HOVER', 'PRESSED', 'SELECTED', 'TRACK', 'SCRIM', 'RIM', 'RIM_PRESSED',
    'GLASS_SECONDARY', 'GLASS_HOVER', 'GLASS_SELECTED', 'GLASS_PRESSED', 'PANEL_SECONDARY', 'PANEL_HOVER', 'PANEL_SELECTED',
    'PANEL_PRESSED', 'PANEL_OVERLAY', 'SHADOW_RAISED'],
  'f32': ['GAP', 'BAR_HEIGHT', 'CARD_RADIUS', 'PANEL_RADIUS', 'SHEET_RADIUS', 'ROW_RADIUS', 'PILL', 'MENU_ROW', 'MENU_WIDTH',
    'BUTTON', 'BUTTON_COMPACT', 'TEXT_TITLE', 'TEXT_BODY', 'TEXT_SMALL', 'TEXT_PAGE', 'TEXT_FIRST_RUN'],
  Duration: ['PRESS', 'QUICK', 'BASE', 'MOVE', 'FLIGHT', 'HOLD'],
  GlassTone: ['SMALL_GLASS', 'LARGE_GLASS', 'MENU_GLASS', 'PLATE_GLASS', 'PANE_GLASS'],
}

test('exo_tokens.rs declares every const exo-design uses, with the same type', () => {
  for (const [type, names] of Object.entries(REQUIRED)) {
    for (const name of names) {
      const re = new RegExp(`pub const ${name}: ${type}\\b`)
      assert.match(src, re, `${name}: ${type}`)
    }
  }
})

test('GlassTone keeps exo-design field names: blur, brightness, contrast, saturation, tint', () => {
  assert.match(src, /pub struct GlassTone \{[\s\S]*?pub blur: f32,[\s\S]*?pub brightness: f32,[\s\S]*?pub contrast: f32,[\s\S]*?pub saturation: f32,[\s\S]*?pub tint: Rgba,/)
})

test('rustc compiles the module and its unit tests pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-tokens-'))
  // gpui as an extern crate, the way the real dependency is linked: a stand-in with the one type the module names.
  const stub = path.join(dir, 'gpui.rs')
  fs.writeFileSync(stub, '#[derive(Clone, Copy, Debug, PartialEq)] pub struct Rgba { pub r: f32, pub g: f32, pub b: f32, pub a: f32 }\n')
  execFileSync('rustc', ['--edition', '2021', '--crate-type', 'rlib', '--crate-name', 'gpui', stub, '-o', path.join(dir, 'libgpui.rlib')], { stdio: 'pipe' })
  const harness = path.join(dir, 'harness.rs')
  fs.writeFileSync(harness, `#[path = ${JSON.stringify(rustFile)}] pub mod exo_tokens;\n`)
  const bin = path.join(dir, process.platform === 'win32' ? 'harness.exe' : 'harness')
  execFileSync('rustc', ['--edition', '2021', '--test', '-D', 'warnings', '--extern', `gpui=${path.join(dir, 'libgpui.rlib')}`, harness, '-o', bin], { stdio: 'pipe' })
  const result = execFileSync(bin, [], { encoding: 'utf8' })
  assert.match(result, /test result: ok\./)
})
