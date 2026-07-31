import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { env } from './env.js';

const TOKEN_TTL = '30d';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Bearer-token auth. We use Authorization headers (not cookies) because the SPA and
 * API live on different domains — a cross-site auth cookie would be a third-party
 * cookie, which incognito windows block (and GATE 6 tests in incognito).
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}
