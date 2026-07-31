import mongoose from 'mongoose';
import { env } from './env.js';

let connected = false;

export async function connectMongo(): Promise<boolean> {
  if (!env.MONGO_URI) {
    console.warn('[db] MONGO_URI not set — skipping connection');
    return false;
  }
  if (connected) return true;
  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log('[db] mongo connected');
    return true;
  } catch (e) {
    console.error('[db] mongo connection failed:', (e as Error).message);
    return false;
  }
}

export function isMongoUp(): boolean {
  return mongoose.connection.readyState === 1;
}
