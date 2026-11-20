// The Changelog pages. build.mjs writes each one into public/ and the Worker renders the same page at the edge, so both
// use these functions and the one template, src/changelog.html. Nothing here touches the network or Node.

export const CHANGELOG_APPS = [
  { app: 'launcher', name: 'Launcher', home: '/launcher' },
  { app: 'cinema', name: 'Cinema', home: '/cinema' },
  { app: 'browser', name: 'Browser', home: '/' },
]

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (text) => text.replace(/[&<>"']/g, (ch) => ESCAPES[ch])

/** An app's CHANGELOG.md at the update address (/v1/<app>/changelog). `origin` is the update address' origin. */
export const changelogUrl = (app, origin = 'https://updates.getexo.app') => `${origin}/v1/${app}/changelog`

const inline = (line) => escapeHtml(line)
  .replace(/\s*_(?:Verified|Checked)[^_]*_\s*$/, '')
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)\]\(https:\/\/([^)\s]+)\)/g, '<a href="https://$2">$1</a>')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

/** Markdown with one "## " section per release into the page's <section>s. Unreleased is left out. */
export function releases(markdown) {
  const sections = []
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) sections.push({ title: line.slice(3).trim(), lines: [] })
    else if (sections.length && line.trim()) sections[sections.length - 1].lines.push(line.trim())
  }
  return sections.filter((section) => section.title !== 'Unreleased').map(({ title, lines }) => {
    const items = lines.filter((line) => line.startsWith('- ')).map((line) => `<li>${inline(line.slice(2))}</li>`).join('')
    const words = lines.filter((line) => !line.startsWith('- ') && !line.startsWith('#')).map((line) => `<p>${inline(line)}</p>`).join('')
    return `<section><h2>${escapeHtml(title)}</h2>${words}${items ? `<ul>${items}</ul>` : ''}</section>`
  }).join('\n')
}

export function renderChangelog(template, { app, name, home }, markdown, assets) {
  const og = app === 'cinema' ? (assets.ogCinema || assets.og) : (assets.ogLauncher || assets.og)
  const fill = {
    app,
    name,
    home,
    releases: releases(markdown),
    ...assets,
    og,
    js: assets.js || 'site.js',
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in fill)) throw new Error(`changelog.html has {{${key}}}, and nothing fills it`)
    return fill[key]
  })
}
