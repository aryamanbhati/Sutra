import { Router } from 'express';
import { z } from 'zod';
import type { NatalChart } from '@sutra/shared';
import { User } from '../models/User.js';
import { Reading } from '../models/Reading.js';
import { CheckIn, MOODS } from '../models/CheckIn.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { asyncHandler } from '../util.js';
import { getRedis } from '../redis.js';
import { computeTransits, deriveFeatures, type TransitFeatures } from '../astro/transits.js';
import { generateReading } from '../reading/generate.js';
import { getStreak, applyCheckIn } from '../streak.js';

export const todayRouter = Router();

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function readingKey(userId: string, date: string): string {
  return `reading:${userId}:${date}`;
}

interface CachedReading {
  date: string;
  narrative: string;
  model: string;
  features: TransitFeatures;
}

todayRouter.get('/today', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: 'not_found' }); return; }
  if (!user.natalChart) { res.status(409).json({ error: 'no_chart' }); return; }

  const date = todayUTC();
  const r = getRedis();
  const key = readingKey(req.userId!, date);
  let source: 'redis' | 'mongo' | 'generated';
  let reading: CachedReading | null = null;

  // 1. Redis fast path
  if (r) {
    const hit = await r.get<CachedReading>(key);
    if (hit) { reading = hit; source = 'redis'; }
  }

  // 2. Mongo
  if (!reading) {
    const doc = await Reading.findOne({ userId: req.userId, date });
    if (doc) {
      reading = {
        date, narrative: doc.narrative, model: doc.model,
        features: doc.transitFeatures as TransitFeatures,
      };
      source = 'mongo';
      if (r) await r.set(key, reading, { ex: 90000 }); // backfill (~25h)
    }
  }

  // 3. Compute + generate
  if (!reading) {
    const transits = computeTransits(new Date());
    const features = deriveFeatures(user.natalChart as unknown as NatalChart, transits);
    const gen = await generateReading(features, user.name);
    reading = { date, narrative: gen.narrative, model: gen.model, features };
    source = 'generated';
    await Reading.updateOne(
      { userId: req.userId, date },
      { $setOnInsert: { userId: req.userId, date, transitFeatures: features, narrative: gen.narrative, model: gen.model } },
      { upsert: true },
    );
    if (r) await r.set(key, reading, { ex: 90000 });
  }

  console.log(`[today] user=${req.userId} date=${date} source=${source!}`);

  const streak = await getStreak(req.userId!);
  const checkIn = await CheckIn.findOne({ userId: req.userId, date });

  res.json({
    date,
    narrative: reading.narrative,
    model: reading.model,
    features: reading.features,
    cache: source!,
    streak,
    checkedInToday: Boolean(checkIn),
    checkIn: checkIn ? { mood: checkIn.mood, energy: checkIn.energy, note: checkIn.note } : null,
  });
}));

const checkInSchema = z.object({
  mood: z.enum(MOODS),
  energy: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

todayRouter.post('/checkin', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', issues: parsed.error.flatten() });
    return;
  }
  const date = todayUTC();
  const transits = computeTransits(new Date());
  const snapshot = {
    moonSign: transits.moonSign,
    moonNakshatra: transits.moonNakshatra.name,
    activeAspects: [] as string[],
  };

  await CheckIn.updateOne(
    { userId: req.userId, date },
    { $set: { mood: parsed.data.mood, energy: parsed.data.energy, note: parsed.data.note ?? '', transitSnapshot: snapshot },
      $setOnInsert: { userId: req.userId, date } },
    { upsert: true },
  );

  const streak = await applyCheckIn(req.userId!, date);
  res.json({ checkedInToday: true, streak, checkIn: { mood: parsed.data.mood, energy: parsed.data.energy, note: parsed.data.note ?? '' } });
}));
