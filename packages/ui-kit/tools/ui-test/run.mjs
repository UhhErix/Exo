// Drives the native UI on a test instance through its in-app test server (exo-inspect's server), by what elements are,
// not where they are. Builds nothing: build first with
//   cargo build --release -p exo-ui --features testkit --target-dir target\testkit      (from native/)
// then
//   node native/tools/ui-test/run.mjs [--suite library] [--fresh]
// The window opens on the second screen without focus (test-instance.ps1). Input goes to the window's own message
// queue: the cursor and the keyboard are untouched. Each run writes native/target/ui-test/<suite>-<time>.json.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const native = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const suiteName = args.includes('--suite') ? args[args.indexOf('--suite') + 1] : 'library';
const exe = path.join(native, 'target', 'testkit', 'release', 'exo-ui.exe');

/** A connection to the test server: `call(method, params)` resolves with the result or throws its error. */
export async function connect(pipe, token, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let socket;
  for (;;) {
    try {
      socket = await new Promise((ok, fail) => {
        const s = net.connect(`\\\\.\\pipe\\${pipe}`);
        s.once('connect', () => ok(s));
        s.once('error', fail);
      });
      break;
    } catch (e) {
      if (Date.now() > deadline) throw new Error(`no test server on ${pipe}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  let buffer = '';
  let next = 1;
  const waiting = new Map();
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      const msg = JSON.parse(line);
      const w = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) w?.fail(new Error(msg.error));
      else w?.ok(msg.result);
    }
  });
  socket.on('close', () => waiting.forEach((w) => w.fail(new Error('the test server went away'))));
  const call = (method, params = {}) =>
    new Promise((ok, fail) => {
      const id = next++;
      waiting.set(id, { ok, fail });
      socket.write(JSON.stringify({ id, method, params }) + '\n');
    });
  const { pid } = await call('hello', { token });
  return { call, pid, end: () => socket.end() };
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const mod = await import(`./${suiteName}.mjs`);
  const suite = mod.default;
  const pipe = `exo-ui-test-${randomBytes(6).toString('hex')}`;
  const token = randomBytes(16).toString('hex');
  const ps = ['-NoProfile', '-File', path.join(native, 'tools', 'test-instance.ps1'), '-UiExe', exe, '-TestPipe', pipe, '-TestToken', token];
  if (args.includes('--fresh')) ps.push('-Fresh');
  // --fake: no .NET host; exo-ui answers from the web page's own mock (fixtures/web-mock.json). Play and install start nothing.
  const fake = args.includes('--fake') || suiteName.startsWith('fake-');
  // A suite may change the fixture for its run (`export function fixture(doc)`): written beside the reports.
  let fixtureFile = path.join(here, 'fixtures', 'web-mock.json');
  if (fake && mod.fixture) {
    const doc = mod.fixture(JSON.parse(readFileSync(fixtureFile, 'utf8')));
    mkdirSync(path.join(native, 'target', 'ui-test'), { recursive: true });
    fixtureFile = path.join(native, 'target', 'ui-test', `fixture-${suiteName}.json`);
    writeFileSync(fixtureFile, JSON.stringify(doc));
  }
  if (fake) ps.push('-FakeHost', fixtureFile);
  // --page-screen 1440: the window drawn as on a 1440p (or 4K at 150%) screen, through EXO_PAGE_SCREEN.
  const env = { ...process.env };
  if (args.includes('--page-screen')) env.EXO_PAGE_SCREEN = args[args.indexOf('--page-screen') + 1];
  else if (suiteName === 'fake-zoom') env.EXO_PAGE_SCREEN = '1440';
  const started = spawnSync('pwsh', ps, { encoding: 'utf8', env });
  if (started.status !== 0) throw new Error(`test-instance.ps1 failed: ${started.stderr || started.stdout}`);
  const hostPid = Number(started.stdout.trim().split(/\s+/).pop());

  const report = { suite: suiteName, started: new Date().toISOString(), hostPid, fake, checks: [], ok: false };
  const check = (name, pass, detail) => {
    report.checks.push({ name, pass: !!pass, detail });
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail === undefined ? '' : `  ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
  };
  let ui;
  try {
    ui = await connect(pipe, token);
    // A picture of the window from outside (capture.ps1), into the report's folder: suites look at what they check.
    const shots = path.join(native, 'target', 'ui-test', 'shots');
    mkdirSync(shots, { recursive: true });
    const shot = (name) => {
      const file = path.join(shots, `${suiteName}-${name}.png`);
      const r = spawnSync('pwsh', ['-NoProfile', '-File', path.join(here, 'capture.ps1'), '-ProcessId', String(ui.pid), '-Out', file], { encoding: 'utf8' });
      return r.status === 0 ? file : null;
    };
    await suite({ call: ui.call, pid: ui.pid, check, report, shot });
  } catch (e) {
    check('suite ran to the end', false, e.message);
  } finally {
    // Close the window as its Close button would; the host quits with it.
    try {
      await ui?.call('close');
    } catch {
      /* already going */
    }
    ui?.end();
    const until = Date.now() + 20000;
    while (processAlive(hostPid) && Date.now() < until) await new Promise((r) => setTimeout(r, 250));
    check(fake ? 'exo-ui quit with its window' : 'host quit with the window', !processAlive(hostPid), `pid ${hostPid}`);
  }
  report.ok = report.checks.every((c) => c.pass);
  report.finished = new Date().toISOString();
  const out = path.join(native, 'target', 'ui-test');
  mkdirSync(out, { recursive: true });
  const file = path.join(out, `${suiteName}-${report.started.replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`${report.ok ? 'PASS' : 'FAIL'}: ${report.checks.filter((c) => c.pass).length}/${report.checks.length}, ${file}`);
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
