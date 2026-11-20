// Writes exo-design's icon table from Exo's glyph map and the newest @tabler/icons (pinned in package.json).
// node gen-icons.mjs <map.mjs> [--check]. Exo's map is the web UI's, ui/scripts/tabler-map.mjs in the Launcher repo: one map
// for both UIs, so pass that file. The output is committed, so the crate builds with no Node and no map beside it.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const here = import.meta.dirname
const args = process.argv.slice(2)
const check = args.includes('--check')
const mapArg = args.find(a => !a.startsWith('--'))
if (!mapArg) {
  console.error('usage: node gen-icons.mjs <map.mjs> [--check]  (Exo\'s map: ui/scripts/tabler-map.mjs in the Launcher repo)')
  process.exit(2)
}
const mapPath = path.resolve(mapArg)
const { TABLER } = await import(pathToFileURL(mapPath))
const root = path.join(here, 'node_modules/@tabler/icons/icons')
const version = JSON.parse(fs.readFileSync(path.join(here, 'node_modules/@tabler/icons/package.json'), 'utf8')).version
const output = path.resolve(here, '../crates/exo-design/src/icons_gen.rs')

const stripComments = (raw) => {
  let prev = ''
  let cur = raw
  while (cur !== prev) {
    prev = cur
    cur = cur.replace(/<!--[\s\S]*?-->/g, '')
  }
  return cur.replace(/<!--|-->/g, '')
}

const missing = []
const rows = Object.entries(TABLER).sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, tabler]) => {
  const filled = tabler.endsWith('-filled')
  const file = filled ? `filled/${tabler.slice(0, -7)}.svg` : `outline/${tabler}.svg`
  const full = path.join(root, file)
  if (!fs.existsSync(full)) { missing.push(`${name} -> ${tabler}`); return null }
  const svg = stripComments(fs.readFileSync(full, 'utf8'))
    .replace(/\s*\n\s*/g, ' ')
    .replace(/class="[^"]*"\s*/g, '')
    .replace(/stroke="currentColor"/g, 'stroke="#000"')
    .replace(/fill="currentColor"/g, 'fill="#000"')
    .trim()
  return { name, svg }
}).filter(Boolean)
if (missing.length) { console.error('Not in @tabler/icons ' + version + ':\n  ' + missing.join('\n  ')); process.exit(1) }

const constant = name => name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^(\d)/, '_$1')
const text = `// Written by tools/gen-icons.mjs from Exo's glyph map and @tabler/icons ${version} (MIT). Do not edit.
#![cfg_attr(rustfmt, rustfmt_skip)]

${rows.map(r => `pub const ${constant(r.name)}: &str = "icons/${r.name}.svg";`).join('\n')}

pub(crate) const ALL: &[(&str, &str)] = &[
${rows.map(r => `    ("icons/${r.name}.svg", r##"${r.svg}"##),`).join('\n')}
];
`
if (check) {
  // A Windows checkout with autocrlf turns the committed LF into CRLF; compare without that.
  const same = fs.existsSync(output) && fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n') === text
  console.log(same ? `Icons match the map and @tabler/icons ${version}.` : 'Icons are out of date: run node gen-icons.mjs.')
  process.exit(same ? 0 : 1)
}
fs.writeFileSync(output, text)
console.log(`${rows.length} icons from @tabler/icons ${version} written.`)
