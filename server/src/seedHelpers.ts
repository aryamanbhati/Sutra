import type { Types } from 'mongoose';
import type { NatalChart, Mood } from '@sutra/shared';
import { Astrologer } from './models/Astrologer.js';
import { Consultation } from './models/Consultation.js';
import { Prediction } from './models/Prediction.js';
import { CheckIn } from './models/CheckIn.js';
import { computeTransits } from './astro/transits.js';
import { SIGNS, wholeSignHouse, signIndex } from './astro/constants.js';

type AstrologerInstance = InstanceType<typeof Astrologer>;

// Small, opinionated astrologer roster — kept realistic for the AstroLive audience.
const ASTROLOGER_SEEDS = [
  { name: 'Vandana Kaur', specialties: ['relationships', 'career'], languages: ['English', 'Hindi', 'Punjabi'], ratePerMin: 22, avatarSeed: 'vandana' },
  { name: 'Rajeev Menon', specialties: ['career', 'finance'], languages: ['English', 'Malayalam'], ratePerMin: 30, avatarSeed: 'rajeev' },
  { name: 'Priya Iyer', specialties: ['marriage', 'family'], languages: ['English', 'Tamil'], ratePerMin: 18, avatarSeed: 'priya' },
];

export async function ensureAstrologers(): Promise<AstrologerInstance[]> {
  const existing: AstrologerInstance[] = await Astrologer.find({});
  if (existing.length >= ASTROLOGER_SEEDS.length) return existing;
  const missing = ASTROLOGER_SEEDS.filter((s) => !existing.some((e) => e.name === s.name));
  if (missing.length) await Astrologer.insertMany(missing);
  return Astrologer.find({});
}

interface PastConsultation {
  topic: string;
  summary: string;
  astrologerIdx: number; // into ensureAstrologers() result
  daysAgo: number;
  predictions: {
    text: string;
    windowFromDaysAgo: number; // negative = future
    windowToDaysAgo: number;
    status: 'open' | 'fulfilled' | 'missed' | 'unclear';
    userNote?: string;
  }[];
}

// Three past consultations, four predictions total: 2 fulfilled, 1 open, 1 missed.
// Matches the Phase 6 seed spec exactly, so this helper is the single source of truth.
export const DEMO_PAST: PastConsultation[] = [
  {
    topic: 'Career transition — should I switch roles?',
    summary:
      'Discussed the Saturn transit through the 10th house. Vandana advised patience through Q3 and to expect clearer signals near a new-moon window in September.',
    astrologerIdx: 0,
    daysAgo: 42,
    predictions: [
      {
        text: 'A concrete role opportunity will surface within the next 6 weeks — likely mid-August.',
        windowFromDaysAgo: 40,
        windowToDaysAgo: 5,
        status: 'fulfilled',
        userNote: 'A referral came through on Aug 14 — took the meeting.',
      },
    ],
  },
  {
    topic: 'Family — friction with parents on a life decision',
    summary:
      'Priya read the 4th-house Rahu placement and suggested a specific conversation window between the full moon and the following Saturday.',
    astrologerIdx: 2,
    daysAgo: 24,
    predictions: [
      {
        text: 'The tension will ease after a direct conversation in the next 10 days.',
        windowFromDaysAgo: 22,
        windowToDaysAgo: 12,
        status: 'missed',
        userNote: "Didn't happen — conversation kept getting deferred.",
      },
      {
        text: 'A family gathering later this year will bring an unexpected reconciliation.',
        windowFromDaysAgo: 20,
        windowToDaysAgo: -60,
        status: 'open',
      },
    ],
  },
  {
    topic: 'Money — a large expense on the horizon',
    summary:
      'Rajeev flagged a Jupiter aspect on the 2nd house lord and recommended waiting on any large purchase until after Mercury goes direct.',
    astrologerIdx: 1,
    daysAgo: 11,
    predictions: [
      {
        text: 'A financial windfall or unexpected credit will arrive before the end of the month.',
        windowFromDaysAgo: 10,
        windowToDaysAgo: -3,
        status: 'fulfilled',
        userNote: 'A late payment from a client cleared on the 21st.',
      },
    ],
  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export async function seedDemoPast(userId: Types.ObjectId | string): Promise<{ consultations: number; predictions: number }> {
  const astrologers = await ensureAstrologers();

  // Idempotency: if this user already has consultations, do nothing.
  const existing = await Consultation.countDocuments({ userId });
  if (existing > 0) return { consultations: 0, predictions: 0 };

  let predictionCount = 0;
  for (const past of DEMO_PAST) {
    const astro = astrologers[past.astrologerIdx];
    const consultation = await Consultation.create({
      userId,
      astrologerId: astro._id,
      astrologerName: astro.name,
      topic: past.topic,
      summary: past.summary,
      createdAt: daysAgo(past.daysAgo),
      predictionIds: [],
    });
    const predIds = [];
    for (const p of past.predictions) {
      const pred = await Prediction.create({
        userId,
        source: 'astrologer',
        astrologerId: astro._id,
        astrologerName: astro.name,
        consultationId: consultation._id,
        text: p.text,
        madeAt: daysAgo(past.daysAgo),
        targetWindow: { from: daysAgo(p.windowFromDaysAgo), to: daysAgo(p.windowToDaysAgo) },
        status: p.status,
        userNote: p.userNote,
        resolvedAt: p.status !== 'open' ? daysAgo(Math.max(0, p.windowToDaysAgo)) : undefined,
      });
      predIds.push(pred._id);
      predictionCount++;
    }
    consultation.predictionIds = predIds;
    await consultation.save();
  }
  return { consultations: DEMO_PAST.length, predictions: predictionCount };
}

// Deliberately concentrated pattern the correlation engine should find:
// house 8 or 12 → anxious (dark/hidden houses — occult, endings, seclusion)
// house 4 or 5  → calm (home, rest, expression)
// house 10 or 11 → energised (visible action, gains)
// The remaining houses cycle through the non-signal moods, ensuring the
// concentration lives ONLY in the target houses. Strictly deterministic — no
// dayIdx-based variation dilutes the signal.
function moodForMoonHouse(moonHouse: number, dayIdx: number): Mood {
  if (moonHouse === 8 || moonHouse === 12) return 'anxious';
  if (moonHouse === 4 || moonHouse === 5) return 'calm';
  if (moonHouse === 10 || moonHouse === 11) return 'energised';
  const filler: Mood[] = ['hopeful', 'unsettled', 'low', 'hopeful'];
  return filler[dayIdx % filler.length];
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function dateAtNoonUTC(daysAgo: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

/**
 * Seeds 28 days of check-ins with mood deliberately correlated to Moon-in-house
 * transits. 28 days is one full lunar cycle plus one day, so every sign gets
 * visited at least twice and the target-house pairs (8&12, 4&5, 10&11) reliably
 * clear the correlation engine's ≥3 support threshold. Idempotent per (userId,
 * date). Skips today. Returns count of check-ins created.
 */
export async function seedDemoCheckIns(
  userId: Types.ObjectId | string,
  natal: NatalChart,
): Promise<{ created: number }> {
  const ascIdx = SIGNS.indexOf(natal.ascendant);
  let created = 0;
  for (let daysAgo = 28; daysAgo >= 1; daysAgo--) {
    const at = dateAtNoonUTC(daysAgo);
    const date = dateStr(daysAgo);
    const transits = computeTransits(at);
    const moonHouse = wholeSignHouse(signIndex(transits.planets.find((p) => p.body === 'Moon')!.lon), ascIdx);
    const mood = moodForMoonHouse(moonHouse, daysAgo);
    const energy = mood === 'low' || mood === 'anxious' ? 2 : mood === 'energised' ? 5 : 4;

    const result = await CheckIn.updateOne(
      { userId, date },
      {
        $setOnInsert: {
          userId, date, mood, energy, note: '',
          transitSnapshot: {
            moonSign: transits.moonSign,
            moonNakshatra: transits.moonNakshatra.name,
            activeAspects: [],
          },
          createdAt: at,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) created++;
  }
  return { created };
}
