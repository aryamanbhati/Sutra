import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Mood } from '@sutra/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { KundliSquare } from '../components/KundliSquare';

interface StreakState {
  current: number; longest: number; lastCheckInDate: string | null; freezesRemaining: number;
}
interface TodayFeatures {
  moon: { sign: string; nakshatra: string; pada: number };
}
interface TodayResponse {
  date: string; narrative: string; model: string; features: TodayFeatures; cache: string;
  streak: StreakState; checkedInToday: boolean;
  checkIn: { mood: Mood; energy: number; note: string } | null;
}

const MOODS: { key: Mood; label: string }[] = [
  { key: 'calm', label: 'Calm' },
  { key: 'hopeful', label: 'Hopeful' },
  { key: 'energised', label: 'Energised' },
  { key: 'unsettled', label: 'Unsettled' },
  { key: 'anxious', label: 'Anxious' },
  { key: 'low', label: 'Low' },
];

export default function Today() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    api<TodayResponse>('/api/today')
      .then((d) => { setData(d); requestAnimationFrame(() => setReveal(true)); })
      .catch(() => setErr('Could not load today.'));
  }, []);

  if (err) return <Shell><p className="font-mono text-clay">{err}</p></Shell>;
  if (!data || !user?.natalChart) return <Shell><p className="font-mono text-indigo-soft">aligning the day…</p></Shell>;

  const today = new Date(data.date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-widest text-brass uppercase">sutra · today</p>
        <nav className="flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-indigo-soft">
          <Link to="/chart" className="hover:text-brass">chart</Link>
          <Link to="/life" className="hover:text-brass">life file</Link>
          <button onClick={logout} className="hover:text-clay">sign out</button>
        </nav>
      </header>

      <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-4xl md:text-5xl text-indigo leading-none">{today}</h1>
        <StreakBadge streak={data.streak} />
      </div>

      <div className="mt-10 grid md:grid-cols-[300px_1fr] gap-10 items-start">
        {/* 1. kundli reveals first */}
        <div
          className="bg-paper border border-indigo/15 p-5 rounded-sm flex justify-center transition-all duration-700"
          style={{ opacity: reveal ? 1 : 0, transform: reveal ? 'none' : 'scale(0.96)' }}
        >
          <KundliSquare chart={user.natalChart} size={260} />
        </div>

        {/* 2. reading reveals second */}
        <div
          className="transition-all duration-700"
          style={{ opacity: reveal ? 1 : 0, transform: reveal ? 'none' : 'translateY(12px)', transitionDelay: '250ms' }}
        >
          <p className="font-mono text-xs uppercase tracking-widest text-indigo-soft">
            Moon · {data.features.moon.sign} · {data.features.moon.nakshatra}
          </p>
          <p className="mt-4 text-lg leading-relaxed text-indigo whitespace-pre-line">{data.narrative}</p>
          <p className="mt-4 font-mono text-[11px] text-indigo-soft/60">
            grounded reading · {data.model} · {data.cache === 'redis' ? 'cached' : 'fresh'}
          </p>
        </div>
      </div>

      {/* 3. check-in reveals last */}
      <div
        className="mt-12 transition-all duration-700"
        style={{ opacity: reveal ? 1 : 0, transform: reveal ? 'none' : 'translateY(12px)', transitionDelay: '500ms' }}
      >
        <CheckInPanel
          initial={data.checkIn}
          done={data.checkedInToday}
          onDone={(streak, checkIn) => setData({ ...data, streak, checkedInToday: true, checkIn })}
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen px-6 py-12 max-w-4xl mx-auto">{children}</main>;
}

function StreakBadge({ streak }: { streak: StreakState }) {
  return (
    <div className="flex items-center gap-3 font-mono">
      <span className="text-xs uppercase tracking-widest text-indigo-soft">streak</span>
      <span className="text-3xl text-brass tabular-nums">{String(streak.current).padStart(2, '0')}</span>
      <span className="text-xs text-indigo-soft/70">
        longest {streak.longest} · {streak.freezesRemaining} freezes
      </span>
    </div>
  );
}

function CheckInPanel({
  initial, done, onDone,
}: {
  initial: { mood: Mood; energy: number; note: string } | null;
  done: boolean;
  onDone: (streak: StreakState, checkIn: { mood: Mood; energy: number; note: string }) => void;
}) {
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [energy, setEnergy] = useState<number>(initial?.energy ?? 3);
  const [note, setNote] = useState(initial?.note ?? '');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!mood) return;
    setBusy(true);
    try {
      const r = await api<{ streak: StreakState; checkIn: { mood: Mood; energy: number; note: string } }>(
        '/api/checkin',
        { method: 'POST', body: JSON.stringify({ mood, energy, note }) },
      );
      onDone(r.streak, r.checkIn);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="border border-indigo/15 bg-paper p-6 rounded-sm">
        <p className="font-mono text-xs uppercase tracking-widest text-brass">logged for today</p>
        <p className="mt-2 text-indigo">
          You felt <span className="font-display text-2xl">{initial?.mood}</span>, energy {initial?.energy}/5.
          {initial?.note && <span className="text-indigo-soft"> “{initial.note}”</span>}
        </p>
        <p className="mt-2 font-mono text-xs text-indigo-soft/70">Come back tomorrow to keep the thread.</p>
      </div>
    );
  }

  return (
    <div className="border border-indigo/15 bg-paper p-6 rounded-sm">
      <h2 className="font-display text-2xl text-indigo">How did today actually feel?</h2>
      <p className="mt-1 text-sm text-indigo-soft">One log a day. This is the thread the chart gets read against.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMood(m.key)}
            className={`px-4 py-2 font-mono text-sm border transition ${
              mood === m.key
                ? 'bg-indigo text-paper border-indigo'
                : 'bg-stone text-indigo border-indigo/20 hover:border-brass'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <label className="font-mono text-xs uppercase tracking-widest text-indigo-soft">energy · {energy}/5</label>
        <input
          type="range" min={1} max={5} value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
          className="mt-2 w-full accent-brass"
        />
      </div>

      <textarea
        value={note} onChange={(e) => setNote(e.target.value)} rows={2}
        placeholder="Optional — a line about the day."
        className="mt-4 w-full bg-stone border border-indigo/20 px-3 py-2 text-indigo focus:border-brass outline-none resize-none"
      />

      <button
        onClick={submit} disabled={!mood || busy}
        className="mt-4 bg-indigo text-paper px-6 py-3 font-mono text-sm uppercase tracking-widest hover:bg-indigo-soft transition disabled:opacity-40"
      >
        {busy ? 'logging…' : 'log today'}
      </button>
    </div>
  );
}
