var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/validate.js
var MAX_BODY = 96 * 1024;
var MAX_RESULTS = 100;
var MAX_METRICS = 16;
var MAX_RESULT_BYTES = 1024;
var CLASS_KEYS = ["board", "cpu", "display", "form", "gpu", "gpuCompiler", "gpuDriverMajor", "headphone", "hz", "nic", "os", "ramGb", "res", "storage", "vrr"];
var DROP_ORDER = ["board", "storage", "form", "gpuDriverMajor", "ramGb", "cpu", "vrr", "os"];
var CAPABILITY = /^[a-z][a-z0-9-]{1,31}$/;
var GAME = /^(steam|epic|gog|ea|ubisoft|battlenet|riot):[A-Za-z0-9._-]{1,64}$/;
var TRIED = /^[a-z0-9._:=,;@+-]{1,48}$/;
var METRIC = /^[a-z][A-Za-z0-9]{0,31}$/;
var MODEL = /^[a-z0-9][a-z0-9 ._+()@-]{0,63}$/;
var HZ_BANDS = [60, 75, 90, 100, 120, 144, 165, 175, 200, 240, 280, 360, 480, 540];
var VRR = ["on", "driver-off", "monitor-menu", "cable", "none", "true", "false"];
function classValue(key, value) {
  switch (key) {
    case "ramGb":
      return Number.isInteger(value) && value >= 2 && value <= 1024 && value % 2 === 0 ? String(value) : null;
    case "os":
      return Number.isInteger(value) && value >= 1e4 && value <= 99999 ? String(value) : null;
    case "gpuDriverMajor":
      return Number.isInteger(value) && value >= 1 && value <= 99999 ? String(value) : null;
    case "hz":
      return Number.isInteger(value) && HZ_BANDS.includes(value) ? String(value) : null;
    case "vrr":
      return typeof value === "boolean" ? String(value) : typeof value === "string" && VRR.includes(value) ? value : null;
    case "form":
      return value === "desktop" || value === "laptop" || value === "handheld" ? value : null;
    case "storage":
      return value === "nvme" || value === "ssd" || value === "hdd" ? value : null;
    case "gpuCompiler":
      return typeof value === "string" && /^[a-z0-9_]{2,40}@[0-9]{1,3}\.[0-9]{1,5}$/.test(value) ? value : null;
    case "res":
      return typeof value === "string" && /^[1-9][0-9]{2,4}x[1-9][0-9]{2,4}$/.test(value) ? value : null;
    default:
      return typeof value === "string" && MODEL.test(value) && value.trim() === value ? value : null;
  }
}
__name(classValue, "classValue");
function canonicalClass(cls) {
  if (!cls || typeof cls !== "object" || Array.isArray(cls)) return null;
  const keys = Object.keys(cls);
  if (keys.length === 0 || keys.length > CLASS_KEYS.length) return null;
  const parts = [];
  for (const key of keys.sort()) {
    if (!CLASS_KEYS.includes(key)) return null;
    const value = classValue(key, cls[key]);
    if (value === null) return null;
    parts.push(`${key}=${value}`);
  }
  return parts.join("|");
}
__name(canonicalClass, "canonicalClass");
var NUMERIC = ["ramGb", "os", "gpuDriverMajor", "hz"];
function parseClass(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > 800) return null;
  const cls = {};
  for (const part of text.split("|")) {
    const at = part.indexOf("=");
    if (at <= 0) return null;
    const key = part.slice(0, at);
    const raw = part.slice(at + 1);
    if (Object.hasOwn(cls, key)) return null;
    cls[key] = NUMERIC.includes(key) ? /^[0-9]{1,6}$/.test(raw) ? Number(raw) : NaN : raw;
  }
  return canonicalClass(cls) === text ? text : null;
}
__name(parseClass, "parseClass");
function classLevels(canonical) {
  const levels = [canonical];
  let current = canonical.split("|");
  for (const key of DROP_ORDER) {
    if (!current.some((p) => p.startsWith(key + "="))) continue;
    current = current.filter((p) => !p.startsWith(key + "="));
    if (current.length === 0) break;
    levels.push(current.join("|"));
  }
  return levels;
}
__name(classLevels, "classLevels");
function isNumber(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
__name(isNumber, "isNumber");
function checkResult(r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return { error: "a result must be an object" };
  const allowed = ["capability", "game", "class", "tried", "result", "rolledBack", "crashed"];
  for (const key of Object.keys(r)) if (!allowed.includes(key)) return { error: `unknown field ${key}` };
  if (typeof r.capability !== "string" || !CAPABILITY.test(r.capability)) return { error: "capability" };
  if (r.game !== void 0 && (typeof r.game !== "string" || !GAME.test(r.game))) return { error: "game" };
  const cls = canonicalClass(r.class);
  if (cls === null) return { error: "class" };
  if (typeof r.tried !== "string" || !TRIED.test(r.tried) || r.tried.trim() !== r.tried) return { error: "tried" };
  if (typeof r.rolledBack !== "boolean") return { error: "rolledBack" };
  if (r.crashed !== void 0 && typeof r.crashed !== "boolean") return { error: "crashed" };
  const res = r.result;
  if (!res || typeof res !== "object" || Array.isArray(res)) return { error: "result" };
  if (res.score !== void 0 && !isNumber(res.score, -1e9, 1e9)) return { error: "result.score" };
  if (res.helped !== void 0 && ![-1, 0, 1].includes(res.helped)) return { error: "result.helped" };
  if (res.score === void 0 && res.helped === void 0) return { error: "result needs score or helped" };
  const metrics = {};
  let count = 0;
  for (const [name, value] of Object.entries(res)) {
    if (name === "score" || name === "helped") continue;
    if (!METRIC.test(name) || !isNumber(value, -1e9, 1e9)) return { error: `result.${name}` };
    if (++count > MAX_METRICS) return { error: "too many metrics" };
    metrics[name] = value;
  }
  const size = new TextEncoder().encode(cls + r.tried + JSON.stringify(metrics) + r.capability + (r.game ?? "")).length;
  if (size > MAX_RESULT_BYTES) return { error: "too large a result" };
  return {
    value: {
      capability: r.capability,
      game: r.game ?? "",
      cls,
      tried: r.tried,
      score: res.score ?? null,
      helped: res.helped ?? null,
      rolledBack: r.rolledBack ? 1 : 0,
      crashed: r.crashed ? 1 : 0,
      metrics: JSON.stringify(metrics)
    }
  };
}
__name(checkResult, "checkResult");
function checkBatch(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "not a batch" };
  for (const key of Object.keys(body)) if (key !== "v" && key !== "results") return { error: `unknown field ${key}` };
  if (body.v !== 1) return { error: "v must be 1" };
  if (!Array.isArray(body.results) || body.results.length === 0 || body.results.length > MAX_RESULTS) return { error: `results must hold 1 to ${MAX_RESULTS}` };
  const rows = [];
  for (const [i, r] of body.results.entries()) {
    const checked = checkResult(r);
    if (checked.error) return { error: `results[${i}]: ${checked.error}` };
    rows.push(checked.value);
  }
  return { value: rows };
}
__name(checkBatch, "checkBatch");
var isCapability = /* @__PURE__ */ __name((text) => typeof text === "string" && CAPABILITY.test(text), "isCapability");
var isGame = /* @__PURE__ */ __name((text) => typeof text === "string" && GAME.test(text), "isGame");

// src/sign.js
var CONTEXT = "exo-perf-v1";
function fromBase64(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > 400 || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return null;
  try {
    return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}
__name(fromBase64, "fromBase64");
var utcDay = /* @__PURE__ */ __name((date = /* @__PURE__ */ new Date()) => date.toISOString().slice(0, 10), "utcDay");
function dayIsFresh(day, now = /* @__PURE__ */ new Date()) {
  return day === utcDay(now) || day === utcDay(new Date(now.getTime() - 864e5));
}
__name(dayIsFresh, "dayIsFresh");
async function verify(keyB64, sigB64, day, body) {
  const spki = fromBase64(keyB64);
  const sig = fromBase64(sigB64);
  if (!spki || !sig || sig.length !== 64 || spki.length < 80 || spki.length > 100) return false;
  try {
    const key = await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, new TextEncoder().encode(`${CONTEXT}
${day}
${body}`));
  } catch {
    return false;
  }
}
__name(verify, "verify");
async function mac(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
  return [...bytes.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(mac, "mac");
var sender = /* @__PURE__ */ __name((keyB64, secret) => mac(secret, ["sender", keyB64].join("\n")), "sender");
var contributor = /* @__PURE__ */ __name((keyB64, secret, capability = "", game = "") => mac(secret, ["row", keyB64, capability, game].join("\n")), "contributor");
var networkId = /* @__PURE__ */ __name((network, secret, day) => mac(secret, ["net", day, network].join("\n")), "networkId");

// src/aggregate.js
var MIN_CONTRIBUTORS = 5;
var MIN_DAYS = 3;
var MIN_ARM_CONTRIBUTORS = 3;
var MAX_FAIL_RATE = 0.1;
var MAX_ARMS = 10;
function median(values) {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
__name(median, "median");
function trim(values) {
  if (values.length < 3) return values;
  const m = median(values);
  const mad = median(values.map((v) => Math.abs(v - m))) * 1.4826;
  if (mad === 0) return values.filter((v) => v === m);
  return values.filter((v) => Math.abs(v - m) <= 3 * mad);
}
__name(trim, "trim");
function wilson(helped, hurt, neutral) {
  const n = helped + hurt + neutral;
  if (n === 0) return null;
  const p = (helped + neutral / 2) / n;
  const z = 1.96, z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n);
}
__name(wilson, "wilson");
function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1e3) / 1e3 : null;
}
__name(round, "round");
function fromVotes(votes) {
  const contributors = new Set(votes.map((v) => v.contributor));
  const days = new Set(votes.flatMap((v) => v.days));
  if (contributors.size < MIN_CONTRIBUTORS || days.size < MIN_DAYS) return null;
  const byArm = /* @__PURE__ */ new Map();
  for (const v of votes) {
    if (!byArm.has(v.tried)) byArm.set(v.tried, []);
    byArm.get(v.tried).push(v);
  }
  const arms = [];
  for (const [tried, list] of byArm) {
    let helped = 0, hurt = 0, neutral = 0;
    const scores = [];
    let failed = 0, results2 = 0;
    for (const v of list) {
      if (v.score !== null && v.score !== void 0) scores.push(v.score);
      if (v.helped !== null && v.helped !== void 0) {
        if (v.helped > 0) helped++;
        else if (v.helped < 0) hurt++;
        else neutral++;
      }
      failed += v.failed;
      results2 += v.results;
    }
    const marked = helped + hurt + neutral;
    arms.push({
      tried,
      n: new Set(list.map((v) => v.contributor)).size,
      score: scores.length ? round(median(trim(scores))) : null,
      net: marked ? (helped - hurt) / marked : null,
      sure: wilson(helped, hurt, neutral),
      helped,
      hurt,
      neutral,
      rolledBack: round(results2 ? failed / results2 : 0)
    });
  }
  const eligible = arms.filter((a) => a.n >= MIN_ARM_CONTRIBUTORS && a.rolledBack <= MAX_FAIL_RATE && (a.net === null || a.net > 0));
  const judged = eligible.some((a) => a.net !== null) ? eligible.filter((a) => a.net !== null) : eligible;
  judged.sort((a, b) => (a.sure !== null ? b.sure - a.sure : (b.score ?? -Infinity) - (a.score ?? -Infinity)) || (b.score ?? 0) - (a.score ?? 0) || b.n - a.n || a.tried.localeCompare(b.tried));
  const best = judged[0] ?? null;
  const shown = arms.filter((a) => a.n >= MIN_ARM_CONTRIBUTORS).sort((a, b) => b.n - a.n || a.tried.localeCompare(b.tried)).slice(0, MAX_ARMS);
  return {
    n: contributors.size,
    days: days.size,
    best: best?.tried ?? null,
    confidence: best ? round(best.n / (best.n + 10)) : 0,
    arms: Object.fromEntries(shown.map((a) => [a.tried, { n: a.n, score: a.score, helped: a.helped, hurt: a.hurt, neutral: a.neutral, rolledBack: a.rolledBack }]))
  };
}
__name(fromVotes, "fromVotes");

// src/store.js
var KEEP_DAYS = 30;
var STALE_DAYS = 3;
var PAIRS_PER_RUN = 150;
var PAGE = 2e3;
async function admit(db, { day, net, wideNet, sender: sender2, count }) {
  const known = await db.prepare("SELECT first_day FROM keys WHERE sender = ?1").bind(sender2).first();
  const isNew = !known;
  const newKey = isNew ? 1 : 0;
  const statements = [
    db.prepare("INSERT INTO budget (day, results, new_keys) VALUES (?1, ?2, ?3) ON CONFLICT(day) DO UPDATE SET results = results + excluded.results, new_keys = new_keys + excluded.new_keys").bind(day, count, newKey),
    db.prepare("INSERT INTO networks (day, net, results, new_keys) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(day, net) DO UPDATE SET results = results + excluded.results, new_keys = new_keys + excluded.new_keys").bind(day, net, count, newKey),
    db.prepare("INSERT INTO senders (day, sender, results) VALUES (?1, ?2, ?3) ON CONFLICT(day, sender) DO UPDATE SET results = results + excluded.results").bind(day, sender2, count),
    db.prepare("INSERT INTO keys (sender, first_day, last_day) VALUES (?1, ?2, ?2) ON CONFLICT(sender) DO UPDATE SET last_day = excluded.last_day").bind(sender2, day)
  ];
  if (wideNet && isNew) statements.push(db.prepare("INSERT INTO wide_networks (day, net, new_keys) VALUES (?1, ?2, 1) ON CONFLICT(day, net) DO UPDATE SET new_keys = new_keys + 1").bind(day, wideNet));
  try {
    await db.batch(statements);
  } catch (error) {
    if (/CHECK constraint/i.test(String(error?.message ?? error))) return { refused: "enough for today" };
    throw error;
  }
  return { mature: !isNew && known.first_day < day };
}
__name(admit, "admit");
function rowId() {
  const words = crypto.getRandomValues(new Uint32Array(2));
  return (words[0] & 1048575) * 4294967296 + words[1];
}
__name(rowId, "rowId");
async function addResults(db, rows, day, mature) {
  const insert = db.prepare(
    "INSERT INTO results (id, day, capability, game, cls, tried, contributor, score, helped, rolled_back, crashed, metrics, mature) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
  );
  await db.batch(rows.map((r) => insert.bind(rowId(), day, r.capability, r.game, r.cls, r.tried, r.contributor, r.score, r.helped, r.rolledBack, r.crashed, r.metrics, mature ? 1 : 0)));
}
__name(addResults, "addResults");
async function startFor(db, capability, game, cls) {
  for (const [level, key] of classLevels(cls).entries()) {
    const row = await db.prepare("SELECT answer FROM starts WHERE capability = ?1 AND game = ?2 AND cls = ?3").bind(capability, game, key).first();
    if (row) return { level, cls: key, ...JSON.parse(row.answer) };
  }
  return null;
}
__name(startFor, "startFor");
async function foldPair(db, capability, game, updated) {
  const groups = /* @__PURE__ */ new Map();
  let after = ["", "", ""];
  for (; ; ) {
    const page = (await db.prepare(
      `SELECT cls, tried, contributor, AVG(score) AS score, AVG(helped) AS helped,
              SUM(CASE WHEN rolled_back = 1 OR crashed = 1 THEN 1 ELSE 0 END) AS failed, COUNT(*) AS results, GROUP_CONCAT(DISTINCT day) AS days
       FROM results
       WHERE mature = 1 AND capability = ?1 AND game = ?2 AND (cls, tried, contributor) > (?3, ?4, ?5)
       GROUP BY cls, tried, contributor
       ORDER BY cls, tried, contributor LIMIT ?6`
    ).bind(capability, game, after[0], after[1], after[2], PAGE).all()).results ?? [];
    for (const v of page) {
      const vote = { tried: v.tried, contributor: v.contributor, score: v.score, helped: v.helped, failed: v.failed, results: v.results, days: String(v.days).split(",") };
      for (const level of classLevels(v.cls)) {
        if (!groups.has(level)) groups.set(level, []);
        groups.get(level).push(vote);
      }
    }
    if (page.length < PAGE) break;
    const last = page[page.length - 1];
    after = [last.cls, last.tried, last.contributor];
  }
  const insert = db.prepare("INSERT OR REPLACE INTO starts (capability, game, cls, answer, contributors, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6)");
  const statements = [];
  for (const [cls, votes] of groups) {
    const answer2 = fromVotes(votes);
    if (answer2) statements.push(insert.bind(capability, game, cls, JSON.stringify(answer2), answer2.n, updated));
  }
  for (let i = 0; i < statements.length; i += 200) await db.batch(statements.slice(i, i + 200));
  return statements.length;
}
__name(foldPair, "foldPair");
async function fold(db, now = /* @__PURE__ */ new Date()) {
  const today = utcDay(now);
  const cutoff = utcDay(new Date(now.getTime() - KEEP_DAYS * 864e5));
  const stale = new Date(now.getTime() - STALE_DAYS * 864e5).toISOString();
  await db.batch([
    db.prepare("DELETE FROM results WHERE day < ?1").bind(cutoff),
    db.prepare("DELETE FROM keys WHERE last_day < ?1").bind(cutoff),
    db.prepare("DELETE FROM networks WHERE day < ?1").bind(today),
    db.prepare("DELETE FROM wide_networks WHERE day < ?1").bind(today),
    db.prepare("DELETE FROM senders WHERE day < ?1").bind(today),
    db.prepare("DELETE FROM budget WHERE day < ?1").bind(today),
    db.prepare("DELETE FROM starts WHERE updated < ?1").bind(stale)
  ]);
  const cursor = JSON.parse((await db.prepare("SELECT v FROM fold_state WHERE k = 'cursor'").first())?.v ?? '["",""]');
  const pairs = (await db.prepare(
    "SELECT DISTINCT capability, game FROM results WHERE mature = 1 AND (capability, game) > (?1, ?2) ORDER BY capability, game LIMIT ?3"
  ).bind(cursor[0], cursor[1], PAIRS_PER_RUN).all()).results ?? [];
  const updated = now.toISOString();
  let written = 0;
  for (const { capability, game } of pairs) written += await foldPair(db, capability, game, updated);
  const next = pairs.length < PAIRS_PER_RUN ? ["", ""] : [pairs.at(-1).capability, pairs.at(-1).game];
  await db.prepare("INSERT INTO fold_state (k, v) VALUES ('cursor', ?1) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(JSON.stringify(next)).run();
  return written;
}
__name(fold, "fold");

// src/worker.js
var JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
var answer = /* @__PURE__ */ __name((status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS }), "answer");
function expandIpv6(ip) {
  if (!/^[0-9a-fA-F:]+$/.test(ip) || (ip.match(/::/g) ?? []).length > 1) return null;
  const [head, tail] = ip.includes("::") ? ip.split("::") : [ip, null];
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const missing = 8 - left.length - right.length;
  if (tail === null ? left.length !== 8 : missing < 1) return null;
  const groups = [...left, ...Array(tail === null ? 0 : missing).fill("0"), ...right];
  return groups.every((g) => g.length >= 1 && g.length <= 4) ? groups.map((g) => g.padStart(4, "0").toLowerCase()).join(":") : null;
}
__name(expandIpv6, "expandIpv6");
function networkKey(request, groups = 4) {
  const ip = request.headers.get("cf-connecting-ip") ?? "";
  if (!ip.includes(":")) return ip || "unknown";
  const full = expandIpv6(ip);
  return full ? full.split(":").slice(0, groups).join(":") : ip;
}
__name(networkKey, "networkKey");
async function limited(limiter, key) {
  if (!limiter) return false;
  const { success } = await limiter.limit({ key });
  return !success;
}
__name(limited, "limited");
async function readBody(request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY) return { status: 413 };
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      return { status: 413 };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  return { text: new TextDecoder().decode(bytes) };
}
__name(readBody, "readBody");
async function results(request, env, now = /* @__PURE__ */ new Date()) {
  if (request.method !== "POST") return answer(405, { error: "POST only" });
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return answer(415, { error: "JSON only" });
  const network = networkKey(request);
  if (await limited(env.PER_NETWORK, `results:${network}`)) return answer(429, { error: "slow down" });
  const body = await readBody(request);
  if (body.status) return answer(body.status, { error: "too large" });
  const key = request.headers.get("x-exo-key");
  const sig = request.headers.get("x-exo-sig");
  const day = request.headers.get("x-exo-day");
  if (!key || !sig || !day || !dayIsFresh(day, now)) return answer(401, { error: "unsigned" });
  if (!await verify(key, sig, day, body.text)) return answer(401, { error: "bad signature" });
  if (!env.CONTRIBUTOR_SECRET) return answer(503, { error: "not ready" });
  const secret = env.CONTRIBUTOR_SECRET;
  const who = await sender(key, secret);
  if (await limited(env.PER_CONTRIBUTOR, `results:${who}`)) return answer(429, { error: "slow down" });
  if (await limited(env.CEILING, "results")) return answer(429, { error: "busy" });
  let parsed;
  try {
    parsed = JSON.parse(body.text);
  } catch {
    return answer(400, { error: "not JSON" });
  }
  const checked = checkBatch(parsed);
  if (checked.error) return answer(422, { error: checked.error });
  if (!env.DB) return answer(503, { error: "no store" });
  const today = utcDay(now);
  const admitted = await admit(env.DB, {
    day: today,
    net: await networkId(network, secret, today),
    wideNet: network.includes(":") ? await networkId("wide " + networkKey(request, 3), secret, today) : null,
    sender: who,
    count: checked.value.length
  });
  if (admitted.refused) return answer(429, { error: admitted.refused });
  const rows = [];
  for (const r of checked.value) rows.push({ ...r, contributor: await contributor(key, secret, r.capability, r.game) });
  await addResults(env.DB, rows, today, admitted.mature);
  return answer(202, { kept: rows.length });
}
__name(results, "results");
async function start(request, env, ctx) {
  if (request.method !== "GET") return answer(405, { error: "GET only" });
  if (await limited(env.PULL_PER_NETWORK, `start:${networkKey(request)}`)) return answer(429, { error: "slow down" });
  const url = new URL(request.url);
  const capability = url.searchParams.get("capability");
  const cls = parseClass(url.searchParams.get("class"));
  const game = url.searchParams.get("game") ?? "";
  if (!isCapability(capability) || cls === null || game !== "" && !isGame(game)) return answer(400, { error: "capability, class (canonical) and an optional game" });
  if (!env.DB) return answer(503, { error: "no store" });
  const cacheKey = new Request(`https://perf.getexo.app/v1/ai/start?capability=${encodeURIComponent(capability)}&class=${encodeURIComponent(cls)}&game=${encodeURIComponent(game)}`);
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const hit = cache ? await cache.match(cacheKey) : null;
  if (hit) return hit;
  const found = await startFor(env.DB, capability, game, cls);
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" };
  const response = found ? new Response(JSON.stringify({ v: 1, capability, game: game || void 0, ...found }), { status: 200, headers }) : new Response(JSON.stringify({ v: 1, capability, start: null }), { status: 404, headers });
  if (cache && ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
__name(start, "start");
var worker_default = {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/v1/ai/results") return results(request, env);
    if (pathname === "/v1/ai/start") return start(request, env, ctx);
    if (pathname === "/") return new Response("Exo performance data. See getexo.app/privacy.", { headers: { "content-type": "text/plain" } });
    return answer(404, { error: "not found" });
  },
  async scheduled(_event, env, ctx) {
    if (env.DB) ctx.waitUntil(fold(env.DB));
  }
};
export {
  worker_default as default,
  expandIpv6,
  networkKey,
  readBody,
  results,
  start
};
