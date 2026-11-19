# Exo

Shared resources for [Exo Launcher](https://github.com/UhhErix/Exo-Launcher) and
[Exo Cinema](https://github.com/UhhErix/Exo-Cinema). This repo does not contain either app.

| Path | Contents |
| --- | --- |
| [`site/`](site) | getexo.app source snapshot |
| [`workers/`](workers) | Self-hostable site, update and app services |
| [`packages/`](packages) | Native UI kit and design system |

## Build and test

From the repository root, use Node.js and npm for the website and design system,
and the Rust toolchain described in the [UI kit README](packages/ui-kit/README.md)
for the native UI workspace:

```sh
npm ci --prefix site
npm run build --prefix site
npm test --prefix site

npm run build --prefix packages/design-system
npm test --prefix packages/design-system

node --test workers/exo-updates/test/worker.test.mjs

cargo build --manifest-path packages/ui-kit/Cargo.toml
cargo test --manifest-path packages/ui-kit/Cargo.toml
```

The [site README](site/README.md) describes generated assets and the network access
needed for the build. Worker configs use placeholder resource IDs; these commands
do not deploy anything or change production Cloudflare settings.

## App downloads

There are no app installers in this repo. See
[Exo Launcher Releases](https://github.com/UhhErix/Exo-Launcher/releases) and
[Exo Cinema Releases](https://github.com/UhhErix/Exo-Cinema/releases). The
[existing download page](https://getexo.app/download/) remains in use until the
GitHub release cutover.

First-party source is [MIT licensed](LICENSE); see [third-party notices](THIRD_PARTY_NOTICES.md).
