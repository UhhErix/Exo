// Bug reports and ideas as forum posts in #bugs and #ideas: a duplicate check first, tags looked up at runtime from the
// forum's own available_tags, then the post itself.
//
// How it could fail: a second post for a report that is already open; a post with the wrong or no app tag; more than five
// tags (Discord refuses); a title Discord refuses (it must be 1 to 100 characters).
import { redact } from './triage.js';

export const APP_NAME = Object.freeze({ launcher: 'Exo Launcher', cinema: 'Exo Cinema' });
// The forum tags the bot looks for by name. Launcher's is "ExoLauncher", Cinema's "Exo Cinema" (the forum's own names).
export const APP_TAG = Object.freeze({ launcher: 'ExoLauncher', cinema: 'Exo Cinema' });
const AREAS = [
  ['Library', /\blibrary\b|\bgame list\b/i],
  ['Store', /\bstores?\b|\bsteam\b|\bepic\b|\bgog\b|\briot\b|\bxbox\b/i],
  ['Music', /\bmusic\b|\bspotify\b|\blyrics\b/i],
  ['Discord', /\bdiscord\b/i],
  ['PC', /\bgpu\b|\bdrivers?\b|\bhdr\b|\bdisplay\b|\bshaders?\b|\bupscal\w*|\bgraphics\b/i],
  ['Devices', /\bmouse\b|\bkeyboard\b|\bcontroller\b|\baudio\b|\bdevices?\b/i],
  ['Settings', /\bsettings?\b/i],
];
const STOP = new Set(['the', 'and', 'with', 'this', 'that', 'from', 'when', 'what', 'not', 'but', 'after', 'before', 'for', 'was', 'are', 'you', 'exo', 'launcher', 'cinema', 'bug', 'report', 'idea', 'help']);
export const DUPLICATE_SCORE = 0.5;

/** Title words, lower case, without the short and common ones, with a light stem ("crashes", "crashed" -> "crash"). */
export function tokens(title) {
  return new Set(
    String(title)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !STOP.has(word))
      .map((word) => (word.length > 5 ? word.replace(/(ing|ed|es|s)$/, '') : word)),
  );
}

/** Jaccard similarity of two word sets: shared words over all words. */
export function similarity(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** The open thread in this forum whose title is closest to the new title, when it is close enough; otherwise null. */
export function findDuplicate(threads, forumId, title) {
  const wanted = tokens(title);
  let best = null;
  let bestScore = 0;
  for (const thread of threads) {
    if (thread.parent_id !== forumId) continue;
    const score = similarity(wanted, tokens(thread.name ?? ''));
    if (score > bestScore) {
      best = thread;
      bestScore = score;
    }
  }
  return bestScore >= DUPLICATE_SCORE ? best : null;
}

/** The tag ids to apply (at most five): Idea for an idea, the app's tag, and one area tag when the text makes it obvious. */
export function pickTags(availableTags, { kind, app, text }) {
  const byName = new Map(availableTags.map((tag) => [String(tag.name ?? '').toLowerCase(), tag.id]));
  const ids = [];
  const add = (name) => {
    const id = byName.get(name.toLowerCase());
    if (id && !ids.includes(id) && ids.length < 5) ids.push(id);
  };
  if (kind === 'idea') add('Idea');
  if (app) add(APP_TAG[app]);
  for (const [name, pattern] of AREAS) {
    if (pattern.test(text) && byName.has(name.toLowerCase())) {
      add(name);
      break;
    }
  }
  return ids;
}

export function makeTitle({ kind, app, text }) {
  const label = app ? APP_NAME[app] : null;
  const first = String(text).split(/(?<=[.!?])\s|\n/)[0].trim();
  const summary = redact(first).slice(0, 80).trim() || (kind === 'idea' ? 'Idea from #help' : 'Bug report from #help');
  return `${label ? `${label}: ` : ''}${summary}`.slice(0, 100);
}

export function makeBody({ link, app, version, text }) {
  return [
    `Reported in #help: ${link}`,
    `App: ${app ? APP_NAME[app] : 'not named'}`,
    `Version: ${version ?? 'not given'}`,
    '',
    redact(text).slice(0, 1500),
  ].join('\n');
}

/**
 * Files the post: a duplicate check on the forum's open threads, then the post with its tags. Returns
 * { status: 'duplicate' | 'filed', id } where id is the existing or the new thread.
 */
export async function fileThread(rest, { guildId, forumId, kind, app, title, body, text }) {
  const forum = await rest.get(`/channels/${forumId}`);
  const active = await rest.get(`/guilds/${guildId}/threads/active`);
  const duplicate = findDuplicate(active.threads ?? [], forumId, title);
  if (duplicate) return { status: 'duplicate', id: duplicate.id };
  const thread = await rest.post(`/channels/${forumId}/threads`, {
    name: title,
    message: { content: body, allowed_mentions: { parse: [] } },
    applied_tags: pickTags(forum.available_tags ?? [], { kind, app, text }),
  });
  return { status: 'filed', id: thread.id };
}
