// Cheap rules that decide what the bot answers, what it files and what it leaves alone. No model call makes these choices.
//
// How it could fail: chatter between members gets an answer; a question about Exo is ignored; a bug is filed without an app,
// a version and steps; a password, a token or a Windows user name reaches a forum post (redact).

const QUESTION = /(\?|^(how|what|why|where|when|which|who|can|could|does|do|is|are|will|should|help)\b)/i;
const TOPIC =
  /\b(exo|launcher|cinema|steam|epic|gog|riot|xbox|spotify|apple music|youtube music|driver|gpu|hdr|shader|upscal|mouse|install|updat(?:e|es|ing)|download|crash|bug|error|jellyfin|mpv|dolby|sign ?in|account)\b/i;
const BUG =
  /\b(bug|crash(?:es|ed|ing)?|freez(?:e|es|ing)|froze|broken|doesn'?t work|does not work|not working|won'?t (?:open|start|launch|load|install|update)|black screen|error|stuck|fails?)\b/i;
const IDEA = /\b(idea|suggestion|suggest|feature request|would be (?:nice|great|cool|good)|please add|could you add|should add|wish)\b/i;
const FILE = /\b(?:file|log|open|create|make|submit|send|report)\b[^.?!\n]{0,40}\b(?:bug|issue|report|ticket|idea|suggestion)\b|\bfile (?:this|it|that)\b/i;
const STEPS = /\bsteps?\b|\brepro(?:duce)?\b|\bwhen i\b|\bi (?:clicked|opened|pressed|tried|tapped|played|started|launched|installed|went|selected|chose|switched|turned)\b/i;
const LABELLED_VERSION = /\b(?:version|v|build)\s*:?\s*v?(\d+\.\d+(?:\.\d+){0,2})\b/i;
const THREE_PART_VERSION = /\bv?(\d+\.\d+\.\d+)\b/;

/** The message as the bot reads it: mentions and channel links removed, spaces tidied, newlines kept (steps need them). */
export function cleanText(content) {
  return String(content ?? '')
    .replace(/<(?:@!?|@&|#)\d+>/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1500);
}

/** Whether a message in #help (or a thread under it) is for the bot. Mentions of other members are checked by the caller. */
export function shouldAnswer(text, { mentionsBot = false, replyToHuman = false } = {}) {
  if (text.length < 3) return false;
  if (mentionsBot) return true;
  const question = QUESTION.test(text);
  const topic = TOPIC.test(text);
  if (replyToHuman) return question && topic;
  return question || topic;
}

export function appOf(text) {
  const launcher = text.search(/\blauncher\b/i);
  const cinema = text.search(/\bcinema\b/i);
  if (launcher === -1 && cinema === -1) return null;
  if (cinema === -1 || (launcher !== -1 && launcher < cinema)) return 'launcher';
  return 'cinema';
}

export function versionOf(text) {
  const labelled = LABELLED_VERSION.exec(text);
  if (labelled) return labelled[1];
  const three = THREE_PART_VERSION.exec(text);
  return three ? three[1] : null;
}

export function numberedLines(text) {
  return (text.match(/^\s*\d+[.)]\s+\S/gm) ?? []).length;
}

/**
 * Whether a message is a bug report or an idea to file, and what it says: { kind: 'bug' | 'idea' | null, app, version, steps }.
 * A bug needs an app, a version and steps, or an explicit ask to the bot to file it. An idea needs idea words and no bug words.
 */
export function classify(text, { mentionsBot = false } = {}) {
  const app = appOf(text);
  const version = versionOf(text);
  const steps = STEPS.test(text) || numberedLines(text) >= 2;
  const bug = BUG.test(text);
  const idea = IDEA.test(text);
  if (FILE.test(text) && (mentionsBot || /\bbot\b/i.test(text))) {
    return { kind: idea && !bug ? 'idea' : 'bug', app, version, steps };
  }
  if (bug && app && version && steps) return { kind: 'bug', app, version, steps };
  if (idea && !bug && text.length >= 40) return { kind: 'idea', app, version, steps };
  return { kind: null, app, version, steps };
}

/** Takes out what a forum post should not carry: lines that look like a secret, e-mail addresses, long token-looking runs, a Windows user name. */
export function redact(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => (/(password|passcode|recovery code|2fa|token|secret|api key)/i.test(line) ? '[line removed: possible secret]' : line))
    .join('\n')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email removed]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[removed]')
    .replace(/C:\\Users\\[^\\\s]+/gi, 'C:\\Users\\[name]');
}
