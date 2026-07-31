import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { connectMongo, isMongoUp } from './db.js';
import { pingRedis } from './redis.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { todayRouter } from './routes/today.js';
import type { HealthResponse } from '@sutra/shared';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api', userRouter);
app.use('/api', todayRouter);

app.get('/api/health', async (_req, res) => {
  const [db, redis] = await Promise.all([
    Promise.resolve(isMongoUp()),
    pingRedis(),
  ]);
  const body: HealthResponse = {
    ok: true,
    db,
    redis,
    version: '0.0.1',
    time: new Date().toISOString(),
  };
  res.json(body);
});

app.get('/', (_req, res) => {
  res.type('text/plain').send('sutra api — see /api/health');
});

// Backstop error handler — keeps a thrown route from crashing the process.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] unhandled error:', err.message);
  if (!res.headersSent) res.status(500).json({ error: 'server_error' });
});

async function main() {
  await connectMongo();
  app.listen(env.PORT, () => {
    console.log(`[sutra] listening on :${env.PORT}`);
  });
}

main().catch((e) => {
  console.error('[sutra] fatal:', e);
  process.exit(1);
});
