import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Brief {
  user: { id: string; name: string; ascendant: string; moonSign: string; sunSign: string };
  chartSummary: string;
  streak: { current: number; longest: number };
  recentCheckIns: {
    date: string; mood: string; energy: number; note: string;
    moonSign?: string; moonNakshatra?: string;
  }[];
  moodTrend: { mood: string; count: number }[];
  openPredictions: { text: string; astrologerName?: string; madeAt: string; windowEnd: string }[];
  previousTopics: string[];
}

/**
 * Astrologer console demo. The commercial claim ("we save five minutes per call")
 * lives in the header, in Space Mono, as a measurement — CONTEXT LOAD: 0:00 · PREVIOUSLY ~5:00.
 * The page is deliberately dense: everything an astrologer would otherwise re-ask,
 * pre-loaded, on one screen.
 */
export default function Console() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Brief>('/api/insights/brief')
      .then(setBrief)
      .catch(() => setErr('Could not load the context brief.'));
  }, []);

  if (err) return <Shell><p className="font-mono text-clay">{err}</p></Shell>;
  if (!brief) return <Shell><p className="font-mono text-indigo-soft">loading brief…</p></Shell>;

  return (
    <Shell>
      <header className="border-b border-indigo/20 pb-4">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <p className="font-mono text-xs uppercase tracking-widest text-brass">
            sutra · astrologer console
          </p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-indigo">
            context load: <span className="text-brass">0:00</span> · previously ~<span className="text-clay">5:00</span>
          </p>
        </div>
        <h1 className="mt-3 text-5xl leading-none text-indigo font-display">{brief.user.name}</h1>
        <p className="mt-2 font-mono text-sm text-indigo-soft">{brief.chartSummary}</p>
      </header>

      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <StatTile label="streak" value={String(brief.streak.current).padStart(2, '0')} suffix={`longest ${brief.streak.longest}`} />
        <StatTile label="last 5 moods" value={brief.moodTrend[0]?.mood ?? '—'} suffix={brief.moodTrend.slice(0, 3).map((m) => `${m.mood} ×${m.count}`).join(' · ')} />
        <StatTile label="open predictions" value={String(brief.openPredictions.length)} suffix="from other astrologers" />
      </div>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-indigo-soft">recent check-ins</h2>
        {brief.recentCheckIns.length === 0
          ? <p className="mt-3 text-indigo-soft">No check-ins on file yet.</p>
          : (
            <ul className="mt-3 border-t border-indigo/10">
              {brief.recentCheckIns.map((c) => (
                <li key={c.date} className="grid grid-cols-[100px_120px_60px_1fr] gap-3 py-3 border-b border-indigo/10 items-baseline">
                  <span className="font-mono text-xs text-indigo-soft">{c.date}</span>
                  <span className="font-display text-lg text-indigo">{c.mood}</span>
                  <span className="font-mono text-xs text-indigo-soft">e {c.energy}/5</span>
                  <span className="text-sm text-indigo-soft">
                    {c.moonSign && <span className="font-mono text-[11px] text-brass mr-2">Moon · {c.moonSign}</span>}
                    {c.note && <span className="italic">"{c.note}"</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-indigo-soft">open predictions from other astrologers</h2>
        {brief.openPredictions.length === 0
          ? <p className="mt-3 text-indigo-soft">None open.</p>
          : (
            <ul className="mt-3 space-y-3">
              {brief.openPredictions.map((p, i) => (
                <li key={i} className="border border-indigo/15 bg-paper p-4 rounded-sm">
                  <p className="text-indigo">"{p.text}"</p>
                  <p className="mt-2 font-mono text-[11px] text-indigo-soft">
                    from {p.astrologerName ?? 'Sutra'} · window closes {new Date(p.windowEnd).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-indigo-soft">previously asked</h2>
        {brief.previousTopics.length === 0
          ? <p className="mt-3 text-indigo-soft">First-time caller.</p>
          : (
            <ul className="mt-3 space-y-1">
              {brief.previousTopics.map((t, i) => (
                <li key={i} className="text-indigo before:content-['—_'] before:text-brass">{t}</li>
              ))}
            </ul>
          )}
      </section>

      <p className="mt-12 font-mono text-[11px] text-indigo-soft/60">
        Demo view · in production this route is gated to the assigned astrologer.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <nav className="mb-6 font-mono text-xs uppercase tracking-widest text-indigo-soft">
        <Link to="/today" className="hover:text-brass">← back to today</Link>
      </nav>
      {children}
    </main>
  );
}

function StatTile({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="border border-indigo/15 bg-paper p-4 rounded-sm">
      <p className="font-mono text-[11px] uppercase tracking-widest text-indigo-soft">{label}</p>
      <p className="mt-1 font-display text-3xl text-indigo">{value}</p>
      <p className="mt-1 font-mono text-[11px] text-indigo-soft/70">{suffix}</p>
    </div>
  );
}
