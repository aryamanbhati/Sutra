import { useEffect, useState } from 'react';
import type { HealthResponse } from '@sutra/shared';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/health`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <main className="min-h-screen px-6 py-16 max-w-3xl mx-auto">
      <p className="font-mono text-xs tracking-widest text-brass uppercase">
        sutra · gate 0
      </p>
      <h1 className="mt-4 text-6xl leading-none text-indigo">
        The thread through your chart.
      </h1>
      <p className="mt-6 text-lg text-indigo-soft max-w-xl">
        A persistent-memory astrology instrument. One data spine — the Life File — read by you, your
        astrologer, and the daily loop.
      </p>

      <section className="mt-16 border border-indigo/15 bg-paper p-6 rounded-sm">
        <h2 className="font-mono text-xs uppercase tracking-widest text-indigo-soft">
          System check
        </h2>
        {err && <p className="mt-3 text-clay font-mono text-sm">error: {err}</p>}
        {!health && !err && <p className="mt-3 font-mono text-sm text-indigo-soft">…</p>}
        {health && (
          <dl className="mt-4 grid grid-cols-2 gap-y-2 font-mono text-sm">
            <dt className="text-indigo-soft">api</dt>
            <dd>{health.ok ? 'up' : 'down'}</dd>
            <dt className="text-indigo-soft">mongo</dt>
            <dd>{health.db ? 'connected' : 'offline'}</dd>
            <dt className="text-indigo-soft">redis</dt>
            <dd>{health.redis ? 'connected' : 'offline'}</dd>
            <dt className="text-indigo-soft">version</dt>
            <dd>{health.version}</dd>
            <dt className="text-indigo-soft">time</dt>
            <dd>{health.time}</dd>
          </dl>
        )}
      </section>
    </main>
  );
}
