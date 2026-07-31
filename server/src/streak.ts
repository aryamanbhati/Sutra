import { getRedis } from './redis.js';
import { User } from './models/User.js';

export interface StreakState {
  current: number;
  longest: number;
  lastCheckInDate: string | null; // YYYY-MM-DD
  freezesRemaining: number;
}

const FREEZES_PER_MONTH = 2;

function epochDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function sameMonth(a: string | null, b: string): boolean {
  return !!a && a.slice(0, 7) === b.slice(0, 7);
}

/**
 * Pure transition: given the prior streak and the check-in date, compute the next
 * state. A one-day gap continues the streak; a two-day gap is bridged by a freeze if
 * one is available (2 per calendar month); anything larger resets to 1.
 */
export function computeNextStreak(prev: StreakState, date: string): StreakState {
  if (prev.lastCheckInDate === date) return prev; // idempotent — already checked in today

  // Reset freezes at the first check-in of a new month.
  const freezes = sameMonth(prev.lastCheckInDate, date) ? prev.freezesRemaining : FREEZES_PER_MONTH;

  let current: number;
  let freezesRemaining = freezes;

  if (!prev.lastCheckInDate) {
    current = 1;
  } else {
    const gap = epochDay(date) - epochDay(prev.lastCheckInDate);
    if (gap === 1) {
      current = prev.current + 1;
    } else if (gap === 2 && freezes > 0) {
      current = prev.current + 1;
      freezesRemaining = freezes - 1; // spend a freeze to bridge the missed day
    } else {
      current = 1; // streak broken
    }
  }

  return {
    current,
    longest: Math.max(prev.longest, current),
    lastCheckInDate: date,
    freezesRemaining,
  };
}

function key(userId: string): string {
  return `streak:${userId}`;
}

/** Read streak from Redis (fast path); fall back to Mongo and backfill Redis. */
export async function getStreak(userId: string): Promise<StreakState> {
  const r = getRedis();
  if (r) {
    const cached = await r.get<StreakState>(key(userId));
    if (cached) return cached;
  }
  const user = await User.findById(userId).select('streak');
  const s: StreakState = user?.streak
    ? {
        current: user.streak.current ?? 0,
        longest: user.streak.longest ?? 0,
        lastCheckInDate: user.streak.lastCheckInDate ?? null,
        freezesRemaining: user.streak.freezesRemaining ?? FREEZES_PER_MONTH,
      }
    : { current: 0, longest: 0, lastCheckInDate: null, freezesRemaining: FREEZES_PER_MONTH };
  if (r) await r.set(key(userId), s);
  return s;
}

/** Apply a check-in for `date`: update Mongo (authoritative) + Redis (fast path). */
export async function applyCheckIn(userId: string, date: string): Promise<StreakState> {
  const prev = await getStreak(userId);
  const next = computeNextStreak(prev, date);

  await User.findByIdAndUpdate(userId, { streak: next });
  const r = getRedis();
  if (r) await r.set(key(userId), next);
  return next;
}
