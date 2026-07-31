import 'dotenv/config';

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
  ANTHROPIC_API_KEY: opt('ANTHROPIC_API_KEY'),
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
};
