import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load the repo-root .env regardless of the workspace cwd npm runs us from.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../../.env') }); // server/src -> repo root
config(); // also pick up a local .env if present (no-op if none)

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  PORT: Number(process.env.PORT ?? 8080),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  JWT_SECRET: req('JWT_SECRET', 'dev-only-insecure-secret'),
  MONGO_URI: opt('MONGO_URI'),
  UPSTASH_URL: opt('UPSTASH_REDIS_REST_URL'),
  UPSTASH_TOKEN: opt('UPSTASH_REDIS_REST_TOKEN'),
  // Narrative generation via xAI Grok (OpenAI-compatible API).
  XAI_API_KEY: opt('XAI_API_KEY'),
  XAI_MODEL: process.env.XAI_MODEL ?? 'grok-4-fast',
  XAI_BASE_URL: process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1',
};
