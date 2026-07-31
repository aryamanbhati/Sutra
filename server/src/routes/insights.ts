import { Router } from 'express';
import type { NatalChart } from '@sutra/shared';
import { User } from '../models/User.js';
import { CheckIn } from '../models/CheckIn.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { asyncHandler } from '../util.js';
import { computeStrongestCorrelation, type CorrelationInput } from '../insights/correlation.js';
import { buildBrief } from '../insights/brief.js';

export const insightsRouter = Router();

/**
 * The correlation payoff. Returns the strongest mood↔transit association in
 * the user's own log, gated by sample-size rules from correlation.ts.
 */
insightsRouter.get('/insights/correlation', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user?.natalChart) { res.status(409).json({ error: 'no_chart' }); return; }
  const checkIns = await CheckIn.find({ userId: req.userId }).sort({ date: 1 }).lean();
  const input: CorrelationInput[] = checkIns.map((c) => ({
    date: c.date,
    mood: c.mood as CorrelationInput['mood'],
    moonSign: c.transitSnapshot?.moonSign ?? undefined,
  }));
  const result = computeStrongestCorrelation(user.natalChart as unknown as NatalChart, input);
  res.json(result);
}));

/**
 * Astrologer console brief. Route-gated demo — no separate astrologer auth
 * (Phase 5 is a P1 demo screen, not the full product). The caller uses their
 * own token to fetch their own brief.
 */
insightsRouter.get('/insights/brief', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user?.natalChart) { res.status(409).json({ error: 'no_chart' }); return; }
  const brief = await buildBrief(user as unknown as Parameters<typeof buildBrief>[0]);
  res.json(brief);
}));
