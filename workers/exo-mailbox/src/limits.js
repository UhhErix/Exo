/**
 * The limits, sized for Cloudflare's free plan (README.md › Limits). One object so the tests can make the caps small
 * instead of writing 10,000 rows; nothing else changes it.
 */
export const limits = {
  // The largest envelope (plan §2.5: header, HPKE enc, the top padding class, tag, signature) is exactly 64 KiB.
  message: 65536,
  rows: 10_000,
  boxBytes: 50 * 1024 * 1024,
  keepMs: 30 * 24 * 60 * 60 * 1000,
  alarmGapMs: 24 * 60 * 60 * 1000,
  sockets: 16,
  authMs: 10_000,
  pageRows: 256,
  pageBytes: 1 << 20,
  linkMs: 10 * 60 * 1000,
  // Token buckets [size, ms per token]: any frame, and puts (each a row written, the free plan's scarcest thing).
  frames: [60, 2_000],
  puts: [20, 30_000],
  linkFrames: [20, 1_000],
}
