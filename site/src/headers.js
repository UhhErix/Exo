// The headers on everything the site sends: the static files get them through public/_headers (build.mjs writes it
// from this list), and what the Worker answers itself gets them in worker.js.

// Only this site, Cloudflare Web Analytics' beacon (injected at the edge; it reports to this site's own /cdn-cgi/rum)
// and Exo's report address: no inline code, no other hosts, no frames, no forms.
const CSP = [
  "default-src 'none'",
  // The edge injects it as beacon.min.js/v<version>: the trailing slash makes the path a prefix.
  "script-src 'self' https://static.cloudflareinsights.com/beacon.min.js https://static.cloudflareinsights.com/beacon.min.js/",
  "style-src 'self'",
  "img-src 'self'",
  // Exo Cinema's page plays its clips.
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self' https://reports.getexo.app",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
  'upgrade-insecure-requests',
].join('; ')

// Features not used by the site are denied. Only names Chromium knows: an unknown one logs an error on every page.
const DENIED = [
  'accelerometer', 'ambient-light-sensor', 'bluetooth', 'camera', 'clipboard-read',
  'compute-pressure', 'cross-origin-isolated', 'display-capture', 'encrypted-media', 'fullscreen', 'gamepad',
  'geolocation', 'gyroscope', 'hid', 'identity-credentials-get', 'idle-detection', 'keyboard-map', 'local-fonts',
  'magnetometer', 'microphone', 'midi', 'otp-credentials', 'payment', 'picture-in-picture',
  'publickey-credentials-create', 'publickey-credentials-get', 'screen-wake-lock', 'serial', 'storage-access',
  'sync-xhr', 'usb', 'window-management', 'xr-spatial-tracking',
]

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'no-referrer',
  // Exo Cinema's page plays its clips by itself, and copies and shares its link.
  'Permissions-Policy': ['autoplay=(self)', 'clipboard-write=(self)', 'web-share=(self)', ...DENIED.map((name) => `${name}=()`)].join(', '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  // Cloudflare asks browsers to report failed loads to its own address (Network Error Logging); this turns that off.
  NEL: '{"max_age":0}',
}
