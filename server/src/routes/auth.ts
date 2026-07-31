import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword, signToken, requireAuth, type AuthedRequest } from '../auth.js';
import { publicUser } from './shape.js';
import { asyncHandler } from '../util.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'password must be at least 6 characters'),
  name: z.string().min(1).max(80),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', issues: parsed.error.flatten() });
    return;
  }
  const { email, password, name } = parsed.data;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: 'email_taken' });
    return;
  }
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    name,
  });
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation', issues: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  res.json({ token: signToken(user.id), user: publicUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ user: publicUser(user) });
}));
