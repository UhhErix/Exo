import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rewriteDownloadLinks } from '../src/download-links.js'
import { RELEASES, downloadUrl, releasesUrl } from '../src/releases.js'

test('static fallback installer links are rewritten to the current pinned release', () => {
  for (const [app, release] of Object.entries(RELEASES)) {
    const oldAsset = release.asset.replace(release.version, '0.1.0')
    const urls = [
      `/download/${app}`,
      `https://getexo.app/download/${app}`,
      `https://www.getexo.app/download/${app}?old=1`,
      `https://updates.getexo.app/v1/${app}/download`,
      `https://updates.getexo.app/${app}/${oldAsset}`,
      `https://github.com/${release.repo}/releases/latest/download/${oldAsset}`,
      `https://github.com/${release.repo}/releases/download/v0.1.0/${oldAsset}`,
      `https://release-assets.githubusercontent.com/github-production-release-asset/1/old?rscd=${encodeURIComponent(`attachment; filename=${oldAsset}`)}`,
      downloadUrl(app),
    ]
    for (const url of urls) for (const quote of ['"', "'"]) {
      const fallback = `<a class="button" href=${quote}${url}${quote}>Download</a>`
      assert.equal(rewriteDownloadLinks(fallback), `<a class="button" href=${quote}${downloadUrl(app)}${quote}>Download</a>`, url)
    }
  }
  assert.equal(rewriteDownloadLinks('<a href="/download/browser">Download</a>'), `<a href="${releasesUrl('launcher')}">Download</a>`)
})

test('empty, malformed and unrelated links remain unchanged', () => {
  for (const html of ['', '<p>No downloads</p>', '<a href="">Empty</a>', '<a href="http://[">Invalid</a>',
    '<a href="/privacy">Privacy</a>', '<a href="/download/unknown">Unknown</a>',
    '<a href="https://updates.getexo.app/v1/cinema/changelog">Changelog</a>',
    '<a href="https://github.com/UhhErix/Exo-Cinema/releases">Versions</a>',
    '<a href="https://github.com/UhhErix/Exo-Launcher/releases/latest">Latest</a>',
    '<a href="https://github.com/UhhErix/Exo-Cinema/releases/download/v1/source.zip">Source</a>',
    '<a href="https://github.com/other/app/releases/download/v1/Setup.exe">Other app</a>',
    '<a href="https://example.com/download/launcher">Other host</a>']) {
    assert.equal(rewriteDownloadLinks(html), html)
  }
})
