// The slash commands and their replies. /version and /drivers read Exo's JSON, so they take the fetch as a parameter and the
// tests answer them without the network.
import { DRIVERS_URL, LINKS, UPDATES } from './config.js';

export const COMMANDS = Object.freeze([
  { name: 'download', description: 'Where to get Exo Launcher and Exo Cinema (Windows 11)', type: 1 },
  { name: 'help', description: 'What the Exo bot does', type: 1 },
  { name: 'version', description: 'The newest Exo Launcher and Exo Cinema versions', type: 1 },
  { name: 'drivers', description: 'The newest graphics and chipset driver versions Exo has seen', type: 1 },
]);

/** The commands whose reply reads a web address: the interaction is acknowledged first, then edited with the answer. */
export const DEFERRED = new Set(['version', 'drivers']);

export function downloadReply() {
  return [
    `Exo Launcher: ${LINKS.launcher}`,
    `Exo Cinema: ${LINKS.cinema}`,
    `Both are for Windows 11. Help: ${LINKS.help}`,
  ].join('\n');
}

export function helpReply() {
  return [
    'I am the Exo helper. In #help I answer questions about Exo Launcher and Exo Cinema, and I file clear bug reports in #bugs and ideas in #ideas.',
    'Commands: /download, /version, /drivers, /help.',
    'A message in #help is sent to Cloudflare Workers AI to get an answer. I keep the last few messages in memory for 30 minutes and log nothing about members.',
    `For anything else, a mod will help: ${LINKS.help}`,
  ].join('\n');
}

async function readJson(fetcher, url) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`status ${response.status}`);
  return response.json();
}

async function latestVersion(fetcher, url) {
  try {
    const json = await readJson(fetcher, url);
    return typeof json?.version === 'string' ? json.version : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function versionReply(fetcher) {
  const [launcher, cinema] = await Promise.all([latestVersion(fetcher, UPDATES.launcher), latestVersion(fetcher, UPDATES.cinema)]);
  return [`Exo Launcher: ${launcher}`, `Exo Cinema: ${cinema}`, `Downloads: ${LINKS.launcher} and ${LINKS.cinema}`].join('\n');
}

export async function driversReply(fetcher) {
  let data;
  try {
    data = await readJson(fetcher, DRIVERS_URL);
  } catch {
    return 'I could not read the driver versions just now. The driver watch posts them in #driver-releases.';
  }
  const products = Object.entries(data?.products ?? {});
  if (products.length === 0) return 'No driver versions yet. The driver watch posts them in #driver-releases.';
  const lines = products.map(([key, product]) => {
    const tag = product.tag ? ` (${product.tag})` : '';
    const date = product.date ? `, ${product.date}` : '';
    return `${product.label ?? key}: ${product.version}${tag}${date}`;
  });
  return ['The newest drivers the driver watch has seen (posted in #driver-releases):', ...lines].join('\n').slice(0, 1900);
}
