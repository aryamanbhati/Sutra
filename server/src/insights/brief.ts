import type { NatalChart } from '@sutra/shared';
import type { UserDoc } from '../models/User.js';
import { CheckIn } from '../models/CheckIn.js';
import { Consultation } from '../models/Consultation.js';
import { Prediction } from '../models/Prediction.js';

export interface ConsultBrief {
  user: {
    id: string;
    name: string;
    ascendant: string;
    moonSign: string;
    sunSign: string;
  };
  chartSummary: string; // one-line: "Scorpio asc · Moon in Taurus (7) · Sun in Leo (10)"
  streak: { current: number; longest: number };
  recentCheckIns: {
    date: string;
    mood: string;
    energy: number;
    note: string;
    moonSign?: string;
    moonNakshatra?: string;
  }[];
  moodTrend: { mood: string; count: number }[]; // over the last 5 check-ins
  openPredictions: {
    text: string;
    astrologerName?: string;
    madeAt: Date;
    windowEnd: Date;
  }[];
  previousTopics: string[]; // last 5 consultation topics
}

/**
 * Build the pre-consult context brief for one user. This is the whole "we save
 * the astrologer five minutes" argument: everything they'd otherwise have to
 * re-ask, pre-loaded, in one screen. Read-only, expensive queries kept small.
 */
export async function buildBrief(user: UserDoc & { _id: unknown; id: string }): Promise<ConsultBrief> {
  const [recent, openPreds, consults] = await Promise.all([
    CheckIn.find({ userId: user._id }).sort({ date: -1 }).limit(5).lean(),
    Prediction.find({ userId: user._id, status: 'open' }).sort({ madeAt: -1 }).limit(5).lean(),
    Consultation.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const natal = user.natalChart as unknown as NatalChart;
  const moon = natal.planets.find((p) => p.body === 'Moon');
  const sun = natal.planets.find((p) => p.body === 'Sun');

  const chartSummary = [
    `${natal.ascendant} asc`,
    moon && `Moon in ${moon.sign} (${moon.house})`,
    sun && `Sun in ${sun.sign} (${sun.house})`,
  ].filter(Boolean).join(' · ');

  // Mood tally of the last 5 check-ins for a quick trend read.
  const tally = new Map<string, number>();
  for (const c of recent) tally.set(c.mood, (tally.get(c.mood) ?? 0) + 1);
  const moodTrend = [...tally.entries()]
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count);

  return {
    user: {
      id: user.id,
      name: user.name,
      ascendant: natal.ascendant,
      moonSign: moon?.sign ?? '',
      sunSign: sun?.sign ?? '',
    },
    chartSummary,
    streak: { current: user.streak?.current ?? 0, longest: user.streak?.longest ?? 0 },
    recentCheckIns: recent.map((c) => ({
      date: c.date,
      mood: c.mood,
      energy: c.energy,
      note: c.note ?? '',
      moonSign: c.transitSnapshot?.moonSign ?? undefined,
      moonNakshatra: c.transitSnapshot?.moonNakshatra ?? undefined,
    })),
    moodTrend,
    openPredictions: openPreds.map((p) => ({
      text: p.text,
      astrologerName: p.astrologerName ?? undefined,
      madeAt: p.madeAt as Date,
      windowEnd: (p.targetWindow?.to ?? p.madeAt) as Date,
    })),
    previousTopics: consults.map((c) => c.topic),
  };
}
