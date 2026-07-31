import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { publicUser } from './shape.js';
import { computeNatalChart } from '../astro/natal.js';
import { CITIES, IST_OFFSET } from '../data/cities.js';
import { asyncHandler } from '../util.js';

export const userRouter = Router();

const onboardingSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:mm'),
  placeName: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  tzOffset: z.number().int().optional(),
});

userRouter.post('/onboarding', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', issues: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const birthData = {
    date: d.date,
    time: d.time,
    lat: d.lat,
    lng: d.lng,
    tzOffset: d.tzOffset ?? IST_OFFSET,
    placeName: d.placeName,
  };

  let natalChart;
  try {
    natalChart = computeNatalChart(birthData);
  } catch (e) {
    res.status(422).json({ error: 'chart_computation_failed', detail: (e as Error).message });
    return;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (d.name) user.name = d.name;
  // Mongoose accepts plain objects here at runtime; .set() avoids the subdocument-array
  // type friction between our NatalChart type and the schema's hydrated types.
  user.set({ birthData, natalChart });
  await user.save();

  res.json({ user: publicUser(user) });
}));

// City autocomplete from the bundled list.
userRouter.get('/cities', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const matches = (q
    ? CITIES.filter((c) => c.name.toLowerCase().startsWith(q) || c.state.toLowerCase().startsWith(q))
    : CITIES
  ).slice(0, 8);
  res.json({ cities: matches, tzOffset: IST_OFFSET });
});
