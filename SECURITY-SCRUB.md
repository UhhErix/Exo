# Source import security review

Deployment exports, backup bundles and original Git history were not imported.
Worker configs use placeholder resource identifiers. The update Worker omits
Discord announcements and scheduled cache operations. Production-only services
and their settings stay on Cloudflare.
