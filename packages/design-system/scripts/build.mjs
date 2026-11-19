#!/usr/bin/env node
// Renders tokens/tokens.json into dist/: exo.css (the website: no glass), exo-glass.css (the apps' glass, for the
// HTML prototypes and the style page only), exo_tokens.rs (GPUI) and index.html (the living style page).
// npm run build writes them; npm run check fails if they are out of date.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadTokens } from './lib/tokens.mjs'
import { renderCss } from './lib/css.mjs'
import { renderRust } from './lib/rust.mjs'
import { renderHtml } from './lib/html.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function render(tree) {
  const { site, glass } = renderCss(tree)
  return { css: site, glassCss: glass, rust: renderRust(tree), html: renderHtml(tree) }
}

const OUTPUTS = [
  ['dist/exo.css', 'css'],
  ['dist/exo-glass.css', 'glassCss'],
  ['dist/exo_tokens.rs', 'rust'],
  ['dist/index.html', 'html'],
]

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const check = process.argv.includes('--check')
  const out = render(loadTokens())
  let stale = 0
  for (const [file, key] of OUTPUTS) {
    const target = path.join(root, file)
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null
    if (check) {
      if (current !== out[key]) {
        stale++
        console.error(`stale: ${file} (run npm run build)`)
      }
      continue
    }
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, out[key])
    console.log(`wrote ${file}`)
  }
  if (check && stale) process.exit(1)
  if (check) console.log('dist is current')
}
