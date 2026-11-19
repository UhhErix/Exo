import { downloadUrl } from '../../../site/src/releases.js'

// Preserve ordinary paths; old download links go straight to GitHub.
export default {
  fetch(request) {
    const url = new URL(request.url)
    const download = /^\/download\/(launcher|cinema)\/?$/.exec(url.pathname)
    if (download) return Response.redirect(downloadUrl(download[1]), 302)
    return Response.redirect(`https://getexo.app${url.pathname}${url.search}`, 301)
  },
}
