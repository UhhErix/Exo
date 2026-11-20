// The last few messages of each channel the bot answers in, kept in memory only. At most 8 messages per channel, 400
// characters each, each dropped 30 minutes after it was said, and 50 channels at most (the least recently used goes first).
//
// How it could fail: a message outlives its 30 minutes; the memory grows without limit; a channel's history mixes with
// another channel's. The memory is lost when the Durable Object is evicted, which is by design.
export const MEMORY = Object.freeze({ maxMessages: 8, ttlMs: 30 * 60_000, maxChannels: 50, maxChars: 400 });

export class ChatMemory {
  constructor({ clock = () => Date.now() } = {}) {
    this.clock = clock;
    this.channels = new Map(); // channel id -> [{ role, text, at }]
  }

  /** The channel's messages still inside the 30 minutes, oldest first, as { role, text } for the model. */
  get(channel) {
    this.prune(this.clock());
    return (this.channels.get(channel) ?? []).map(({ role, text }) => ({ role, text }));
  }

  add(channel, role, text) {
    const now = this.clock();
    this.prune(now);
    const item = { role, text: String(text).slice(0, MEMORY.maxChars), at: now };
    const items = [...(this.channels.get(channel) ?? []), item].slice(-MEMORY.maxMessages);
    this.channels.delete(channel);
    this.channels.set(channel, items);
    while (this.channels.size > MEMORY.maxChannels) this.channels.delete(this.channels.keys().next().value);
  }

  prune(now) {
    const cutoff = now - MEMORY.ttlMs;
    for (const [channel, items] of this.channels) {
      const kept = items.filter((item) => item.at > cutoff);
      if (kept.length) this.channels.set(channel, kept);
      else this.channels.delete(channel);
    }
  }
}
