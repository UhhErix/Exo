export const RELEASES = {
  launcher: {
    repo: 'UhhErix/Exo-Launcher',
    tag: 'v3.27.0',
    asset: 'ExoLauncher-3.27.0-Setup.exe',
    version: '3.27.0',
    bytes: 136287666,
    sha256: '78aeaf5ef153c21fef59af8068d723669a82123062094b63ab4bb523900e1e9d',
  },
  cinema: {
    repo: 'UhhErix/Exo-Cinema',
    tag: 'v1.5.1',
    asset: 'ExoCinema-1.5.1-Setup.exe',
    version: '1.5.1',
    bytes: 63026926,
    sha256: '1dcda15c07741e64f5f3f046c483fb4585ab79923367b7a233739e24435c145e',
  },
}

export const downloadUrl = (app) =>
  RELEASES[app] ? `https://github.com/${RELEASES[app].repo}/releases/download/${RELEASES[app].tag}/${RELEASES[app].asset}` : null

export const releasesUrl = (app) =>
  RELEASES[app] ? `https://github.com/${RELEASES[app].repo}/releases` : null
