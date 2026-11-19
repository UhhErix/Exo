# Exo Workers

The source modules here were recovered from deployment source maps. The configs are for fresh, self-hosted resources. Replace example origins and placeholder identifiers with your own resources. Production routes, secrets and schedules are not imported.

- `exo-site` serves the web routes and binds to `exo-updates`. The static tree in `../site` is the closest recovered snapshot, with the five content-addressed assets referenced by the edge Worker added from production. It is not an exact production export.
- `exo-updates` is the read-only R2 protocol for existing app updates. It does not announce releases or run scheduled jobs.
- `exo-www`, `exo-covers`, `exo-jam`, `exo-jams`, `exo-mailbox` and `exo-relay` provide the redirect and related app services.

Run the update Worker tests with `node --test workers/exo-updates/test/*.test.mjs` from the repository root.
