import { Astrologer } from './models/Astrologer.js';
import { Consultation } from './models/Consultation.js';
import { Prediction } from './models/Prediction.js';
import type { Types } from 'mongoose';

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
