import type { NatalChart } from '@sutra/shared';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const TOKEN_KEY = 'sutra_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface SutraUser {
  id: string;
  email: string;
  name: string;
  birthData: null | {
    date: string; time: string; lat: number; lng: number; tzOffset: number; placeName: string;
  };
  natalChart: NatalChart | null;
  hasChart: boolean;
  streak: { current: number; longest: number; lastCheckInDate: string | null; freezesRemaining: number };
  createdAt: string;
}

export interface City { name: string; state: string; lat: number; lng: number; }

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? res.statusText;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}
