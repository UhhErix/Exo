// Limits on the bot's answers, kept in memory: one question per member every 10 seconds, 30 per member per UTC day, and 20
// model calls a minute for the whole bot (a cost guard). The counters are lost when the Durable Object is evicted.
//
// How it could fail: a member gets a second answer inside 10 seconds; a member passes 30 in a day; the day rolls over at
// the wrong time; the global cap does not hold.
export const USER_GAP_MS = 10_000;
export const USER_DAILY = 30;
export const AI_PER_MINUTE = 20;
const MAX_USERS = 5000;

const utcDay = (now) => new Date(now).toISOString().slice(0, 10);

export class Limits {
  constructor({ clock = () => Date.now() } = {}) {
    this.clock = clock;
    this.users = new Map(); // member id -> { day, last, count, noticed }
    this.minute = { start: -1, count: 0 };
  }

  /** { ok: true } when the member may ask now; otherwise the reason: 'slow' (within 10 s) or 'daily' (30 used today). */
  take(userId) {
    const now = this.clock();
    const day = utcDay(now);
    let entry = this.users.get(userId);
    if (!entry || entry.day !== day) {
      entry = { day, last: -Infinity, count: 0, noticed: false };
      this.users.delete(userId);
      this.users.set(userId, entry);
      this.trim(day);
    }
    if (now - entry.last < USER_GAP_MS) return { ok: false, reason: 'slow' };
    if (entry.count >= USER_DAILY) return { ok: false, reason: 'daily' };
    entry.last = now;
    entry.count += 1;
    return { ok: true };
  }

  /** True once per member per day: used to say the daily limit once, not on every message. */
  noticeOnce(userId) {
    const entry = this.users.get(userId);
    if (!entry || entry.noticed) return false;
    entry.noticed = true;
    return true;
  }

  /** True when a model call may run now (the whole bot, AI_PER_MINUTE a minute). */
  takeAi(now = this.clock()) {
    const minute = Math.floor(now / 60_000);
    if (this.minute.start !== minute) this.minute = { start: minute, count: 0 };
    if (this.minute.count >= AI_PER_MINUTE) return false;
    this.minute.count += 1;
    return true;
  }

  trim(day) {
    if (this.users.size <= MAX_USERS) return;
    for (const [id, entry] of this.users) if (entry.day !== day) this.users.delete(id);
  }
}
