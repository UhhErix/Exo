// Routes one Gateway dispatch (t, d) to what the bot does with it. Pure: it returns an action, and the Durable Object applies it.
// Only the bot's guild counts. A message is handled in #help itself and in threads under #help (a thread's parent is
// known from GUILD_CREATE and the THREAD_* events, so no message costs an extra REST call). The bot ignores bots and
// system messages, including its own.
//
// How it could fail: a message from another guild or channel is answered; a bot's own message is answered (a loop); a
// thread under #bugs or #ideas is treated as #help; a deleted thread stays in the set.

const IGNORE = Object.freeze({ type: 'ignore' });

export function routeEvent(t, d, { guildId, helpChannel, isHelpThread = () => false }) {
  switch (t) {
    case 'READY':
      return { type: 'ready' };
    case 'GUILD_CREATE':
      if (d?.id !== guildId) return IGNORE;
      return { type: 'threads', ids: (d.threads ?? []).filter((thread) => thread.parent_id === helpChannel).map((thread) => thread.id) };
    case 'THREAD_CREATE':
      if (d?.guild_id !== guildId || d.parent_id !== helpChannel) return IGNORE;
      return { type: 'thread-add', id: d.id };
    case 'THREAD_UPDATE':
      if (d?.guild_id !== guildId) return IGNORE;
      return d.parent_id === helpChannel ? { type: 'thread-add', id: d.id } : { type: 'thread-remove', id: d.id };
    case 'THREAD_DELETE':
      if (d?.guild_id !== guildId) return IGNORE;
      return { type: 'thread-remove', id: d.id };
    case 'MESSAGE_CREATE': {
      if (d?.guild_id !== guildId) return IGNORE;
      if (d.author?.bot || d.author?.system) return IGNORE;
      if (d.channel_id === helpChannel) return { type: 'message', message: d, inThread: false };
      if (isHelpThread(d.channel_id)) return { type: 'message', message: d, inThread: true };
      return IGNORE;
    }
    default:
      return IGNORE;
  }
}
