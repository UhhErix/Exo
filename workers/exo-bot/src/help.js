// The #help flow: decide whether a message is for the bot, rate-limit it, file a bug or an idea, or answer with Workers AI.
// Every reply is a reply to the member's message, and no mention pings anyone.
//
// How it could fail: a message aimed at another member is answered; the bot answers its own message; a member gets two
// answers inside 10 seconds; a failed model call leaves the member with nothing (the bot says it is not sure instead); a
// failed filing says so and points to the form; a reply pings someone.
import { ANSWER, ask, buildMessages } from './ai.js';
import { fileThread, makeBody, makeTitle } from './filing.js';
import { buildSystemPrompt } from './prompt.js';
import { classify, cleanText, shouldAnswer } from './triage.js';

export const NOT_SURE = "I'm not sure, a mod will help.";

export function createHelp({ rest, ai, knowledge, limits, memory, config, clock = () => Date.now(), log = () => {} }) {
  const system = buildSystemPrompt(knowledge, config);

  async function handle(message, { botId = null } = {}) {
    const mentions = Array.isArray(message.mentions) ? message.mentions : [];
    if (message.mention_everyone || mentions.some((user) => user.id !== botId)) return;
    const mentionsBot = botId !== null && mentions.some((user) => user.id === botId);
    const ref = message.referenced_message;
    const replyToHuman = Boolean(ref?.author && !ref.author.bot && ref.author.id !== botId);
    const text = cleanText(message.content);
    if (!text) return;
    const facts = classify(text, { mentionsBot });
    if (!facts.kind && !shouldAnswer(text, { mentionsBot, replyToHuman })) return;
    const gate = limits.take(message.author.id);
    if (!gate.ok) {
      if (gate.reason === 'daily' && limits.noticeOnce(message.author.id)) {
        await reply(message, `You have used today's help questions. Try again tomorrow, or open a ticket in <#${config.channels.ticket}>.`);
      }
      return;
    }
    if (facts.kind) return file(message, text, facts);
    return answer(message, text);
  }

  async function answer(message, text) {
    if (!limits.takeAi(clock())) return;
    const channel = message.channel_id;
    await rest.post(`/channels/${channel}/typing`).catch(() => {});
    let generated = '';
    try {
      generated = await ask(ai, config.model, buildMessages(system, memory.get(channel), text));
    } catch (error) {
      log('model call failed', { error: error?.name ?? 'Error' });
    }
    const content = clamp(generated);
    memory.add(channel, 'user', text);
    memory.add(channel, 'assistant', content);
    await reply(message, content);
  }

  async function file(message, text, facts) {
    const forumId = facts.kind === 'idea' ? config.channels.ideas : config.channels.bugs;
    const title = makeTitle({ kind: facts.kind, app: facts.app, text });
    const body = makeBody({ link: messageLink(message), app: facts.app, version: facts.version, text });
    try {
      const result = await fileThread(rest, { guildId: config.guildId, forumId, kind: facts.kind, app: facts.app, title, body, text });
      const url = `https://discord.com/channels/${config.guildId}/${result.id}`;
      const what = result.status === 'duplicate' ? 'Already reported here' : facts.kind === 'idea' ? 'Filed as an idea' : 'Filed as a bug report';
      await reply(message, `${what}: ${url}`);
    } catch (error) {
      log('filing failed', { error: error?.name ?? 'Error', status: error?.status ?? null });
      await reply(message, 'I could not file that just now. Send it at https://getexo.app/help.');
    }
  }

  function reply(message, content) {
    return rest
      .post(`/channels/${message.channel_id}/messages`, {
        content,
        message_reference: { message_id: message.id, channel_id: message.channel_id, guild_id: config.guildId, fail_if_not_exists: false },
        allowed_mentions: { parse: [] },
      })
      .catch((error) => log('reply failed', { error: error?.name ?? 'Error', status: error?.status ?? null }));
  }

  return { handle };
}

function messageLink(message) {
  return `https://discord.com/channels/${message.guild_id}/${message.channel_id}/${message.id}`;
}

function clamp(generated) {
  const text = String(generated ?? '').trim().slice(0, ANSWER.maxChars);
  return text || NOT_SURE;
}
