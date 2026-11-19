var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../docs/architecture/analytics-schema-v1.json
var analytics_schema_v1_default = {
  v: 1,
  about: "Exo Analytics schema v1. The only events, props and values any Exo app may send to telemetry.getexo.app. Clients drop anything not listed; the Worker rejects the whole batch on any mismatch. Adding an event is a reviewed schema change shipped by both the Worker and the app.",
  batch: {
    apps: ["launcher", "cinema", "os", "browser"],
    gpuClass: ["RTX 50-series", "RTX 40-series", "RTX 30-series", "RTX 20-series", "GTX 16-series", "GTX 10-series", "NVIDIA other", "RX 9000-series", "RX 7000-series", "RX 6000-series", "RX 5000-series", "AMD other", "Arc B-series", "Arc A-series", "Intel integrated", "AMD integrated", "Other"],
    ramClass: ["8 GB", "16 GB", "32 GB", "64 GB", "128 GB"]
  },
  events: {
    launcher: {
      "app.start": {
        ms_p50: { type: "number", min: 0, max: 6e5 },
        ms_p95: { type: "number", min: 0, max: 6e5 },
        count: { type: "number", min: 0, max: 1e3 }
      },
      "room.open": {
        room: { type: "enum", values: ["library", "store", "discord", "music", "pc", "devices", "profile", "settings"] }
      },
      error: {
        area: { type: "enum", values: ["shell", "library", "store", "discord", "music", "pc", "devices", "profile", "settings", "update", "network", "install", "other"] }
      },
      hang: {},
      crash: {},
      "perf.idle": {
        cpu_pct_bucket: { type: "bucket", values: ["lt1", "1to2", "2to5", "5to10", "10plus"] },
        mem_mb_bucket: { type: "bucket", values: ["lt200", "200to400", "400to800", "800to1600", "1600plus"] }
      }
    },
    cinema: {},
    os: {},
    browser: {}
  }
};

// src/worker.js
var SCHEMAS = /* @__PURE__ */ new Map([[analytics_schema_v1_default.v, analytics_schema_v1_default]]);
var MAX_BODY = 64 * 1024;
var DAY_MS = 24 * 60 * 60 * 1e3;
var HOUR_MS = 60 * 60 * 1e3;
var APPS = new Set(analytics_schema_v1_default.batch.apps);
var TOP_KEYS = ["v", "app", "appVersion", "day", "rid", "os", "gpuClass", "ramClass", "events"];
var EVENT_KEYS = /* @__PURE__ */ new Set(["name", "n", "props"]);
var VERSION = /^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$/;
var DAY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
var RID = /^[0-9a-f]{32}$/;
var OS = /^Windows 11 [0-9]{5}(\.[0-9]{1,5})?$/;
var NAME = /^[a-z][a-z0-9_.]{1,47}$/;
var KEY = /^[a-z][a-z0-9_]{0,31}$/;
var MAX_EVENTS = 100;
var MAX_PROPS = 16;
var MAX_N = 1e6;
var MAX_SUMMARY_DAYS = 400;
var MAX_SUMMARY_ROWS = 1e4;
var POSTS_PER_HOUR = 5;
var MAX_TRACKED = 1e4;
var posts = /* @__PURE__ */ new Map();
function overLimit(app, rid, now) {
  if (posts.size >= MAX_TRACKED) {
    for (const [key2, entry2] of posts) if (now - entry2.since >= HOUR_MS) posts.delete(key2);
  }
  const key = `${app}:${rid}`;
  const entry = posts.get(key);
  if (!entry || now - entry.since >= HOUR_MS) {
    posts.set(key, { count: 1, since: now });
    return 0;
  }
  if (entry.count >= POSTS_PER_HOUR) return Math.ceil((entry.since + HOUR_MS - now) / 1e3);
  entry.count++;
  return 0;
}
__name(overLimit, "overLimit");
var Refusal = class extends Error {
  static {
    __name(this, "Refusal");
  }
  constructor(status, reason) {
    super(reason);
    this.status = status;
  }
};
var refuse = /* @__PURE__ */ __name((status, reason) => {
  throw new Refusal(status, reason);
}, "refuse");
var isObject = /* @__PURE__ */ __name((v) => typeof v === "object" && v !== null && !Array.isArray(v), "isObject");
var text = /* @__PURE__ */ __name((body, status, headers = {}) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...headers } }), "text");
var dayOf = /* @__PURE__ */ __name((ms) => new Date(ms).toISOString().slice(0, 10), "dayOf");
function dayMs(day) {
  if (typeof day !== "string" || !DAY.test(day)) return NaN;
  const ms = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(ms) && dayOf(ms) === day ? ms : NaN;
}
__name(dayMs, "dayMs");
function propValue(spec, value) {
  if (spec.type === "number") return typeof value === "number" && Number.isFinite(value) && value >= spec.min && value <= spec.max;
  if (spec.type === "enum" || spec.type === "bucket") return typeof value === "string" && spec.values.includes(value);
  return false;
}
__name(propValue, "propValue");
function validate(batch, now = Date.now()) {
  if (!isObject(batch)) refuse(400, "not an object");
  for (const key of Object.keys(batch)) if (!TOP_KEYS.includes(key)) refuse(400, `unknown key ${key.slice(0, 32)}`);
  for (const key of TOP_KEYS) if (!(key in batch)) refuse(400, `missing ${key}`);
  const schema = SCHEMAS.get(batch.v);
  if (!schema) refuse(400, "unknown schema version");
  if (!schema.batch.apps.includes(batch.app)) refuse(400, "bad app");
  if (typeof batch.appVersion !== "string" || !VERSION.test(batch.appVersion)) refuse(400, "bad appVersion");
  const day = dayMs(batch.day);
  if (!(Math.abs(day - dayMs(dayOf(now))) <= 2 * DAY_MS)) refuse(400, "bad day");
  if (typeof batch.rid !== "string" || !RID.test(batch.rid)) refuse(400, "bad rid");
  if (typeof batch.os !== "string" || !OS.test(batch.os)) refuse(400, "bad os");
  if (!schema.batch.gpuClass.includes(batch.gpuClass)) refuse(400, "bad gpuClass");
  if (!schema.batch.ramClass.includes(batch.ramClass)) refuse(400, "bad ramClass");
  if (!Array.isArray(batch.events) || !batch.events.length) refuse(400, "no events");
  if (batch.events.length > MAX_EVENTS) refuse(400, "too many events");
  const known = schema.events[batch.app] ?? {};
  const events = batch.events.map((event) => {
    if (!isObject(event)) refuse(400, "bad event");
    for (const key of Object.keys(event)) if (!EVENT_KEYS.has(key)) refuse(400, "unknown event key");
    if (typeof event.name !== "string" || !NAME.test(event.name) || !Object.hasOwn(known, event.name)) refuse(400, "unknown event");
    if (!Number.isSafeInteger(event.n) || event.n < 1 || event.n > MAX_N) refuse(400, "bad n");
    if (event.props === void 0) return { name: event.name, n: event.n };
    if (!isObject(event.props)) refuse(400, "bad props");
    const keys = Object.keys(event.props);
    if (keys.length > MAX_PROPS) refuse(400, "too many props");
    const specs = known[event.name];
    for (const key of keys) {
      if (!KEY.test(key) || !Object.hasOwn(specs, key)) refuse(400, "unknown prop");
      if (!propValue(specs[key], event.props[key])) refuse(400, "bad prop value");
    }
    return { name: event.name, n: event.n, props: event.props };
  });
  return {
    app: batch.app,
    day: batch.day,
    rid: batch.rid,
    app_version: batch.appVersion,
    os: batch.os,
    gpu_class: batch.gpuClass,
    ram_class: batch.ramClass,
    events
  };
}
__name(validate, "validate");
async function readBody(request) {
  const length = request.headers.get("content-length");
  if (length !== null && !(Number(length) <= MAX_BODY)) refuse(413, "too large");
  if (!request.body) refuse(400, "empty body");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      refuse(413, "too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    refuse(400, "not utf-8");
  }
}
__name(readBody, "readBody");
function contributions(row, sign, into) {
  const dims = [row.day, row.app, row.app_version, row.os, row.gpu_class, row.ram_class];
  const seen = /* @__PURE__ */ new Set();
  const add = /* @__PURE__ */ __name((event, key, value, n, number) => {
    const id = JSON.stringify([...dims, event, key, value]);
    const entry = into.get(id) ?? { key: [...dims, event, key, value], n: 0, value: 0, batches: 0 };
    entry.n += sign * n;
    entry.value += sign * number;
    if (!seen.has(id)) {
      seen.add(id);
      entry.batches += sign;
    }
    into.set(id, entry);
  }, "add");
  for (const event of row.events) {
    add(event.name, "", "", event.n, 0);
    for (const [key, value] of Object.entries(event.props ?? {})) {
      if (typeof value === "number") add(event.name, key, "", event.n, value);
      else add(event.name, key, String(value), event.n, 0);
    }
  }
  return into;
}
__name(contributions, "contributions");
var UPSERT_AGGREGATES = `INSERT INTO aggregates (day, app, app_version, os, gpu_class, ram_class, event, prop_key, prop_value, sum_n, sum_value, batches)
SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'),
  json_extract(value, '$[4]'), json_extract(value, '$[5]'), json_extract(value, '$[6]'), json_extract(value, '$[7]'),
  json_extract(value, '$[8]'), json_extract(value, '$[9]'), json_extract(value, '$[10]'), json_extract(value, '$[11]')
FROM json_each(?) WHERE true
ON CONFLICT DO UPDATE SET sum_n = sum_n + excluded.sum_n, sum_value = sum_value + excluded.sum_value, batches = batches + excluded.batches`;
var UPSERT_RAW = `INSERT INTO raw (app, day, rid, app_version, os, gpu_class, ram_class, events, received_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (app, day, rid) DO UPDATE SET app_version = excluded.app_version, os = excluded.os, gpu_class = excluded.gpu_class,
  ram_class = excluded.ram_class, events = excluded.events, received_day = excluded.received_day`;
async function store(env, row, now) {
  const old = await env.DB.prepare("SELECT * FROM raw WHERE app = ? AND day = ? AND rid = ?").bind(row.app, row.day, row.rid).first();
  const deltas = contributions(row, 1, /* @__PURE__ */ new Map());
  if (old) contributions({ ...old, events: JSON.parse(old.events) }, -1, deltas);
  const changes = [...deltas.values()].filter((d) => d.n || d.value || d.batches).map((d) => [...d.key, d.n, d.value, d.batches]);
  const statements = [];
  if (changes.length) statements.push(env.DB.prepare(UPSERT_AGGREGATES).bind(JSON.stringify(changes)));
  if (old) statements.push(env.DB.prepare("DELETE FROM aggregates WHERE app = ? AND day = ? AND batches <= 0").bind(old.app, old.day));
  statements.push(
    env.DB.prepare(UPSERT_RAW).bind(row.app, row.day, row.rid, row.app_version, row.os, row.gpu_class, row.ram_class, JSON.stringify(row.events), dayOf(now))
  );
  await env.DB.batch(statements);
}
__name(store, "store");
async function postEvents(request, env) {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") refuse(400, "content-type must be application/json");
  const body = await readBody(request);
  let batch;
  try {
    batch = JSON.parse(body);
  } catch {
    refuse(400, "not json");
  }
  const now = Date.now();
  const row = validate(batch, now);
  const wait = overLimit(row.app, row.rid, now);
  if (wait) return text("too many requests", 429, { "retry-after": String(wait) });
  await store(env, row, now);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
__name(postEvents, "postEvents");
async function authorize(request, env) {
  if (!env.SUMMARY_TOKEN) refuse(503, "not configured");
  const encode = /* @__PURE__ */ __name((s) => new TextEncoder().encode(s), "encode");
  const [given, expected] = await Promise.all(
    [request.headers.get("authorization") ?? "", `Bearer ${env.SUMMARY_TOKEN}`].map((s) => crypto.subtle.digest("SHA-256", encode(s)))
  );
  const a = new Uint8Array(given);
  const b = new Uint8Array(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff) refuse(401, "unauthorized");
}
__name(authorize, "authorize");
async function getSummary(request, env, url) {
  await authorize(request, env);
  const app = url.searchParams.get("app");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!APPS.has(app)) refuse(400, "bad app");
  const span = dayMs(to) - dayMs(from);
  if (!(span >= 0)) refuse(400, "bad from or to");
  if (span > MAX_SUMMARY_DAYS * DAY_MS) refuse(400, "range too long");
  const { results } = await env.DB.prepare(
    `SELECT day, app_version, os, gpu_class, ram_class, event, prop_key, prop_value, sum_n, sum_value, batches FROM aggregates
WHERE app = ? AND day BETWEEN ? AND ? ORDER BY day, event, prop_key, prop_value, app_version, os, gpu_class, ram_class LIMIT ?`
  ).bind(app, from, to, MAX_SUMMARY_ROWS + 1).all();
  const truncated = results.length > MAX_SUMMARY_ROWS;
  return new Response(JSON.stringify({ app, from, to, truncated, rows: results.slice(0, MAX_SUMMARY_ROWS) }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
__name(getSummary, "getSummary");
var ROUTES = {
  "/v1/events": ["POST", postEvents],
  "/v1/health": ["GET", () => text("ok", 200)],
  "/v1/summary": ["GET", getSummary]
};
function cutoffs(now) {
  const today = new Date(dayMs(dayOf(now)));
  const raw = dayOf(today.getTime() - 30 * DAY_MS);
  today.setUTCMonth(today.getUTCMonth() - 13);
  return { raw, aggregates: dayOf(today.getTime()) };
}
__name(cutoffs, "cutoffs");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = ROUTES[url.pathname];
    if (!route) return text("not found", 404);
    if (request.method !== route[0]) return new Response("method not allowed", { status: 405, headers: { allow: route[0] } });
    try {
      return await route[1](request, env, url);
    } catch (error) {
      if (error instanceof Refusal) return text(error.message, error.status);
      return text("server error", 500);
    }
  },
  /** Daily (wrangler.toml › triggers). */
  async scheduled(controller, env) {
    const { raw, aggregates } = cutoffs(controller.scheduledTime ?? Date.now());
    await env.DB.batch([
      env.DB.prepare("DELETE FROM raw WHERE received_day < ?").bind(raw),
      env.DB.prepare("DELETE FROM aggregates WHERE day < ?").bind(aggregates)
    ]);
  }
};
export {
  cutoffs,
  dayOf,
  worker_default as default,
  posts,
  validate
};
