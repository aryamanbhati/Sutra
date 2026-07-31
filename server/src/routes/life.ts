import { Router } from 'express';
import { z } from 'zod';
import { CheckIn } from '../models/CheckIn.js';
import { Reading } from '../models/Reading.js';
import { Consultation } from '../models/Consultation.js';
import { Prediction, PREDICTION_STATUSES } from '../models/Prediction.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { asyncHandler } from '../util.js';
import type { NatalChart } from '@sutra/shared';
import { User } from '../models/User.js';
import { seedDemoPast, seedDemoCheckIns } from '../seedHelpers.js';

export const lifeRouter = Router();

interface TimelineEntry {
  id: string;
  type: 'checkin' | 'reading' | 'consultation' | 'prediction';
  at: string; // ISO — canonical for reverse-chron sort
  data: unknown;
}

lifeRouter.get('/timeline', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.userId;
  const [checkIns, readings, consultations, predictions] = await Promise.all([
    CheckIn.find({ userId }).sort({ date: -1 }).limit(60).lean(),
    Reading.find({ userId }).sort({ date: -1 }).limit(30).lean(),
    Consultation.find({ userId }).sort({ createdAt: -1 }).limit(30).lean(),
    Prediction.find({ userId }).sort({ madeAt: -1 }).limit(30).lean(),
  ]);

  const entries: TimelineEntry[] = [];
  for (const c of checkIns) {
    entries.push({
      id: `checkin:${c._id}`, type: 'checkin',
      at: new Date(`${c.date}T12:00:00Z`).toISOString(),
      data: { date: c.date, mood: c.mood, energy: c.energy, note: c.note, transitSnapshot: c.transitSnapshot },
    });
  }
  for (const r of readings) {
    entries.push({
      id: `reading:${r._id}`, type: 'reading',
      at: new Date(`${r.date}T09:00:00Z`).toISOString(), // read before the check-in of the same date
      data: { date: r.date, narrative: r.narrative, model: r.model },
    });
  }
  for (const c of consultations) {
    entries.push({
      id: `consultation:${c._id}`, type: 'consultation',
      at: new Date(c.createdAt as unknown as string).toISOString(),
      data: { topic: c.topic, summary: c.summary, astrologerName: c.astrologerName, predictionIds: c.predictionIds },
    });
  }
  for (const p of predictions) {
    entries.push({
      id: `prediction:${p._id}`, type: 'prediction',
      at: new Date(p.madeAt as unknown as string).toISOString(),
      data: {
        predictionId: String(p._id),
        text: p.text,
        source: p.source,
        astrologerName: p.astrologerName,
        madeAt: p.madeAt,
        targetWindow: p.targetWindow,
        status: p.status,
        userNote: p.userNote,
        resolvedAt: p.resolvedAt,
      },
    });
  }

  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  res.json({
    entries,
    counts: {
      checkIns: checkIns.length,
      readings: readings.length,
      consultations: consultations.length,
      predictions: predictions.length,
    },
  });
}));

const resolveSchema = z.object({
  status: z.enum(PREDICTION_STATUSES.filter((s) => s !== 'open') as ['fulfilled', 'missed', 'unclear']),
  userNote: z.string().max(500).optional(),
});

lifeRouter.post('/predictions/:id/resolve', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', issues: parsed.error.flatten() });
    return;
  }
  const pred = await Prediction.findOne({ _id: req.params.id, userId: req.userId });
  if (!pred) { res.status(404).json({ error: 'not_found' }); return; }
  pred.status = parsed.data.status;
  pred.userNote = parsed.data.userNote ?? pred.userNote;
  pred.resolvedAt = new Date();
  await pred.save();
  res.json({
    prediction: {
      predictionId: String(pred._id),
      status: pred.status,
      userNote: pred.userNote,
      resolvedAt: pred.resolvedAt,
    },
  });
}));

// Dev/demo utility — conjures the shared past-consultation set for the current user.
// Idempotent: no-op if the user already has consultations. Also used by Phase 6 seed.
lifeRouter.post('/dev/conjure-past', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user?.natalChart) { res.status(409).json({ error: 'no_chart' }); return; }
  const [past, checkIns] = await Promise.all([
    seedDemoPast(req.userId!),
    seedDemoCheckIns(req.userId!, user.natalChart as unknown as NatalChart),
  ]);
  res.json({ ...past, checkInsCreated: checkIns.created });
}));
