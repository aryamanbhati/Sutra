import type { NatalChart, Mood } from '@sutra/shared';
import { computeTransits } from '../astro/transits.js';
import { SIGNS, signIndex, wholeSignHouse } from '../astro/constants.js';

const HONESTY_MIN_CHECKINS = 8; // need enough data
const HONESTY_MIN_SUPPORT = 3;  // and enough evidence in the specific bin

const HOUSE_THEME: Record<number, string> = {
  1: 'self', 2: 'resources', 3: 'effort', 4: 'home', 5: 'expression', 6: 'work',
  7: 'others', 8: 'depth', 9: 'meaning', 10: 'standing', 11: 'gains', 12: 'rest',
};

export interface CorrelationInput {
  date: string; // YYYY-MM-DD
  mood: Mood;
  moonSign?: string; // optional cached snapshot
}

export interface CorrelationInsight {
  ready: true;
  mood: Mood;
  house: number;
  houseTheme: string;
  matches: number;        // check-ins of `mood` on days Moon was in `house`
  daysWithHouse: number;  // total check-ins on days Moon was in `house`
  totalCheckIns: number;
}

export interface CorrelationPending {
  ready: false;
  totalCheckIns: number;
  needed: number;
  reason: 'insufficient_data' | 'no_pattern';
}

export type CorrelationResult = CorrelationInsight | CorrelationPending;

/**
 * For each check-in, derive the Moon's natal-house at that date. Group by
 * (mood, house) and find the tightest concentration where support ≥ MIN_SUPPORT.
 * "Tightest" = highest proportion (matches / daysWithHouse), tie-broken by matches.
 *
 * Honesty rules (from PRD): require ≥8 total check-ins AND ≥3 matches in the
 * chosen (mood, house) bin. Otherwise return `ready: false`. We never present a
 * pattern that isn't statistically defensible in the user's own log.
 */
export function computeStrongestCorrelation(
  natal: NatalChart,
  checkIns: CorrelationInput[],
): CorrelationResult {
  if (checkIns.length < HONESTY_MIN_CHECKINS) {
    return {
      ready: false, totalCheckIns: checkIns.length,
      needed: HONESTY_MIN_CHECKINS - checkIns.length, reason: 'insufficient_data',
    };
  }
  const ascIdx = SIGNS.indexOf(natal.ascendant);

  // (mood, house) → count; also house → total count for the denominator.
  const bins = new Map<string, number>();
  const houseTotals = new Map<number, number>();

  for (const c of checkIns) {
    const at = new Date(`${c.date}T12:00:00Z`);
    const moonSignName = c.moonSign ?? computeTransits(at).moonSign;
    const moonSignIdx = SIGNS.indexOf(moonSignName as (typeof SIGNS)[number]);
    if (moonSignIdx < 0) continue;
    const house = wholeSignHouse(moonSignIdx, ascIdx);
    houseTotals.set(house, (houseTotals.get(house) ?? 0) + 1);
    const key = `${c.mood}|${house}`;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }

  let best: { mood: Mood; house: number; matches: number; ratio: number } | null = null;
  for (const [key, matches] of bins) {
    if (matches < HONESTY_MIN_SUPPORT) continue;
    const [mood, houseStr] = key.split('|');
    const house = Number(houseStr);
    const daysWithHouse = houseTotals.get(house) ?? 0;
    if (daysWithHouse < HONESTY_MIN_SUPPORT) continue;
    const ratio = matches / daysWithHouse;
    if (!best || ratio > best.ratio || (ratio === best.ratio && matches > best.matches)) {
      best = { mood: mood as Mood, house, matches, ratio };
    }
  }

  if (!best) {
    return { ready: false, totalCheckIns: checkIns.length, needed: 0, reason: 'no_pattern' };
  }
  return {
    ready: true,
    mood: best.mood,
    house: best.house,
    houseTheme: HOUSE_THEME[best.house] ?? '',
    matches: best.matches,
    daysWithHouse: houseTotals.get(best.house) ?? 0,
    totalCheckIns: checkIns.length,
  };
}
