export const RELEASES = {
  launcher: {
    repo: 'UhhErix/Exo-Launcher',
    tag: 'v3.28.0',
    asset: 'ExoLauncher-3.28.0-Setup.exe',
    version: '3.28.0',
    bytes: 136392811,
    sha256: '8338277e9609926b1d92fc6947c7be85072252a84e02f78c653ec1ec800059c9',
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
