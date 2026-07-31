import { Redis } from '@upstash/redis';
import { env } from './env.js';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;
  if (!env.UPSTASH_URL || !env.UPSTASH_TOKEN) {
    console.warn('[redis] Upstash creds not set — cache disabled');
    return null;
  }
  client = new Redis({ url: env.UPSTASH_URL, token: env.UPSTASH_TOKEN });
  return client;
}

export async function pingRedis(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    const pong = await r.ping();
    return pong === 'PONG' || pong === 'pong';
  } catch (e) {
    console.error('[redis] ping failed:', (e as Error).message);
    return false;
  }
}
