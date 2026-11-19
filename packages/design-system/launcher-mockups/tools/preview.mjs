// Renders project/*.dc.html boards to PNG without the canvas runtime.
// Usage: node tools/preview.mjs [Name ...]   (no args = every board)
// Writes preview/<Name>.html and shots/<Name>.png at 1440x900, device scale 1.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = join(root, 'project');
const previewDir = join(root, 'preview');
const shotsDir = join(root, 'shots');
mkdirSync(previewDir, { recursive: true });
mkdirSync(shotsDir, { recursive: true });

const browsers = [
  'C:/Users/Erix/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const browser = browsers.find((p) => existsSync(p));
if (!browser) throw new Error('No Edge or Chrome found');

const wanted = process.argv.slice(2);
const names = (wanted.length ? wanted : readdirSync(project).filter((f) => f.endsWith('.dc.html')).map((f) => f.replace('.dc.html', '')));

for (const name of names) {
  const src = readFileSync(join(project, `${name}.dc.html`), 'utf8');
  const helmet = (src.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
  const body = (src.match(/<\/helmet>([\s\S]*?)<\/x-dc>/) || [, ''])[1];
  const size = (src.match(/"\$preview":\{"width":(\d+),"height":(\d+)\}/) || [, '1440', '900']);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">${helmet}</head><body>${body}</body></html>`;
  const out = join(previewDir, `${name}.html`);
  writeFileSync(out, html);
  const png = join(shotsDir, `${name}.png`);
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${size[1]},${size[2]}`, '--virtual-time-budget=4000',
    `--screenshot=${png}`, pathToFileURL(out).href,
  ], { stdio: 'ignore', timeout: 60000 });
  console.log(`${name}: ${png}`);
}
