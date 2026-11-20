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
    tag: 'v1.5.2',
    asset: 'ExoCinema-1.5.2-Setup.exe',
    version: '1.5.2',
    bytes: 63045208,
    sha256: '6e6f5742ca89bd3b068e4a7ad8297bd84f7bdc6bdb18266d7cd115e5bc9b1b53',
  },
}

export const downloadUrl = (app) =>
  RELEASES[app] ? `https://github.com/${RELEASES[app].repo}/releases/download/${RELEASES[app].tag}/${RELEASES[app].asset}` : null

export const releasesUrl = (app) =>
  RELEASES[app] ? `https://github.com/${RELEASES[app].repo}/releases` : null
