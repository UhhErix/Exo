// The version and SHA-256 beside Download. The page works without them.
const release = await fetch('/api/launcher.json').then((response) => response.json()).catch(() => ({}))
if (release.version) document.getElementById('changelog').textContent = `Changelog · ${release.version}`
if (release.sha256) document.getElementById('sha256').textContent = release.sha256
