export const RELEASES = {
  launcher: { repo: 'UhhErix/Exo-Launcher', tag: 'v3.26.0', asset: 'ExoLauncher-3.26.0-Setup.exe', version: '3.26.0', bytes: 212673653, sha256: '4dab24d7573ec66f7a4aa15932663591be2b52382b7632288e0f3882b5e8a0b8' },
  cinema: { repo: 'UhhErix/Exo-Cinema', tag: 'v1.5.1', asset: 'ExoCinema-1.5.1-Setup.exe', version: '1.5.1', bytes: 63026926, sha256: '1dcda15c07741e64f5f3f046c483fb4585ab79923367b7a233739e24435c145e' },
}
export const downloadUrl = (app) => RELEASES[app] ? `https://github.com/${RELEASES[app].repo}/releases/download/${RELEASES[app].tag}/${RELEASES[app].asset}` : null
export const releasesUrl = (app) => RELEASES[app] ? `https://github.com/${RELEASES[app].repo}/releases` : null
