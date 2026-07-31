import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { connectMongo, isMongoUp } from './db.js';
import { pingRedis } from './redis.js';
import type { HealthResponse } from '@sutra/shared';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

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
