import { RELEASES, downloadUrl, releasesUrl } from './releases.js'

const assetApp = (value) => /Exo(Launcher|Cinema)[-_.][^/]*\.exe(?:$|[";])/i.exec(value)?.[1].toLowerCase()

export function rewriteDownloadLinks(html) {
  return html.replace(/\bhref=(["'])([^"']*)\1/g, (attribute, quote, href) => {
    let url
    try {
      url = new URL(href, 'https://getexo.app')
    } catch {
      return attribute
    }
    let app
    if (['getexo.app', 'www.getexo.app', 'updates.getexo.app'].includes(url.hostname)) {
      app = /\/(?:download\/(launcher|cinema|browser)|(?:v1\/)?(launcher|cinema|browser)\/download)(?:\/|$)/i.exec(url.pathname)
      app = app ? (app[1] || app[2]).toLowerCase() : assetApp(url.pathname)
    } else if (url.hostname === 'github.com') {
      app = Object.keys(RELEASES).find((key) => {
        const prefix = `/${RELEASES[key].repo}/releases/`.toLowerCase()
        return url.pathname.toLowerCase().startsWith(prefix) && /^(?:latest\/download|download\/[^/]+)\/[^/]+\.exe$/i.test(url.pathname.slice(prefix.length))
      })
    } else if (url.hostname === 'release-assets.githubusercontent.com') {
      app = assetApp(url.searchParams.get('response-content-disposition') || url.searchParams.get('rscd') || '')
    }
    return app ? `href=${quote}${downloadUrl(app) || releasesUrl('launcher')}${quote}` : attribute
  })
}
