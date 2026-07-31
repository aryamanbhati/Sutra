import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Mood } from '@sutra/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type PredStatus = 'open' | 'fulfilled' | 'missed' | 'unclear';
type EntryType = 'checkin' | 'reading' | 'consultation' | 'prediction';

interface CheckInData { date: string; mood: Mood; energy: number; note?: string; transitSnapshot?: { moonSign?: string; moonNakshatra?: string } }
interface ReadingData { date: string; narrative: string; model: string }
interface ConsultationData { topic: string; summary: string; astrologerName: string; predictionIds: string[] }
interface PredictionData {
  predictionId: string; text: string; source: 'astrologer' | 'system'; astrologerName?: string;
  madeAt: string; targetWindow: { from: string; to: string };
  status: PredStatus; userNote?: string; resolvedAt?: string;
}

interface Entry<T> { id: string; type: EntryType; at: string; data: T }
type AnyEntry =
  | Entry<CheckInData> & { type: 'checkin' }
  | Entry<ReadingData> & { type: 'reading' }
  | Entry<ConsultationData> & { type: 'consultation' }
  | Entry<PredictionData> & { type: 'prediction' };

interface TimelineResponse {
  entries: AnyEntry[];
  counts: { checkIns: number; readings: number; consultations: number; predictions: number };
}

export default function Life() {
  const { logout } = useAuth();
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [conjuring, setConjuring] = useState(false);

  async function load() {
    try {
      const r = await api<TimelineResponse>('/api/timeline');
      setData(r);
    } catch {
      setErr('Could not load your life file.');
    }
  }
  useEffect(() => { load(); }, []);

  async function conjure() {
    setConjuring(true);
    try {
      await api('/api/dev/conjure-past', { method: 'POST' });
      await load();
    } finally {
      setConjuring(false);
    }
  }

  function handleResolved(updated: PredictionData) {
    if (!data) return;
    setData({
      ...data,
      entries: data.entries.map((e) =>
        e.type === 'prediction' && e.data.predictionId === updated.predictionId
          ? { ...e, data: { ...e.data, ...updated } }
          : e,
      ) as AnyEntry[],
    });
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-widest text-brass uppercase">sutra · life file</p>
        <nav className="flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-indigo-soft">
          <Link to="/today" className="hover:text-brass">today</Link>
          <Link to="/chart" className="hover:text-brass">chart</Link>
          <button onClick={logout} className="hover:text-clay">sign out</button>
        </nav>
      </header>

      <h1 className="mt-6 text-5xl leading-none text-indigo">The thread, so far.</h1>
      <p className="mt-3 text-indigo-soft max-w-xl">
        Every check-in, reading, consultation, and prediction — one continuous record. The Life File is what every future consultation reads against.
      </p>

      {data && (
        <p className="mt-4 font-mono text-xs text-indigo-soft/70">
          {data.counts.checkIns} check-ins · {data.counts.readings} readings ·{' '}
          {data.counts.consultations} consultations · {data.counts.predictions} predictions
        </p>
      )}

      {err && <p className="mt-6 text-clay font-mono">{err}</p>}
      {!data && !err && <p className="mt-6 font-mono text-sm text-indigo-soft">…</p>}

      {data && data.counts.consultations === 0 && (
        <div className="mt-8 bg-paper border border-indigo/15 p-5 rounded-sm">
          <p className="text-indigo text-sm">
            {data.entries.length === 0
              ? 'Your Life File starts today. It will fill in as you check in, and as your consultations get recorded.'
              : 'No past consultations on record yet.'}
          </p>
          <p className="mt-2 text-sm text-indigo-soft">
            To see how a well-established file reads, conjure a sample past — three consultations, four predictions.
          </p>
          <button
            onClick={conjure} disabled={conjuring}
            className="mt-3 bg-indigo text-paper px-5 py-2 font-mono text-xs uppercase tracking-widest hover:bg-indigo-soft disabled:opacity-50"
          >
            {conjuring ? 'conjuring…' : 'conjure sample past'}
          </button>
        </div>
      )}

      {data && data.entries.length > 0 && (
        <ol className="mt-10 border-l border-indigo/15 pl-6 space-y-8">
          {data.entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[31px] top-2 w-2 h-2 bg-brass rounded-full" />
              <TimestampLine at={entry.at} type={entry.type} />
              {entry.type === 'checkin' && <CheckInCard data={entry.data} />}
              {entry.type === 'reading' && <ReadingCard data={entry.data} />}
              {entry.type === 'consultation' && <ConsultationCard data={entry.data} />}
              {entry.type === 'prediction' && (
                <PredictionCard data={entry.data} onResolved={handleResolved} />
              )}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

function TimestampLine({ at, type }: { at: string; type: EntryType }) {
  const d = new Date(at);
  const when = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const kind = {
    checkin: 'CHECK-IN',
    reading: 'DAILY READING',
    consultation: 'CONSULTATION',
    prediction: 'PREDICTION',
  }[type];
  return (
    <p className="font-mono text-[11px] uppercase tracking-widest text-indigo-soft/80">
      <span className="text-brass">{kind}</span> · {when}
    </p>
  );
}

function CheckInCard({ data }: { data: CheckInData }) {
  return (
    <div className="mt-2 bg-paper border border-indigo/10 p-4 rounded-sm">
      <p className="text-indigo">
        Felt <span className="font-display text-xl">{data.mood}</span>, energy {data.energy}/5
        {data.transitSnapshot?.moonSign && (
          <span className="font-mono text-[11px] text-indigo-soft/70"> · Moon in {data.transitSnapshot.moonSign} / {data.transitSnapshot.moonNakshatra}</span>
        )}
      </p>
      {data.note && <p className="mt-1 text-sm text-indigo-soft">“{data.note}”</p>}
    </div>
  );
}

function ReadingCard({ data }: { data: ReadingData }) {
  const [open, setOpen] = useState(false);
  const preview = data.narrative.slice(0, 140);
  return (
    <div className="mt-2 bg-paper border border-indigo/10 p-4 rounded-sm">
      <p className="text-indigo text-sm leading-relaxed">
        {open ? data.narrative : `${preview}${data.narrative.length > 140 ? '…' : ''}`}
      </p>
      {data.narrative.length > 140 && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 font-mono text-[11px] uppercase tracking-widest text-brass hover:underline"
        >
          {open ? 'less' : 'read more'}
        </button>
      )}
    </div>
  );
}

function ConsultationCard({ data }: { data: ConsultationData }) {
  return (
    <div className="mt-2 bg-paper border border-indigo/10 p-4 rounded-sm">
      <p className="font-mono text-xs text-indigo-soft">with {data.astrologerName}</p>
      <p className="mt-1 text-indigo font-display text-xl">{data.topic}</p>
      <p className="mt-2 text-sm text-indigo-soft leading-relaxed">{data.summary}</p>
    </div>
  );
}

function PredictionCard({
  data, onResolved,
}: {
  data: PredictionData;
  onResolved: (p: PredictionData) => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<PredStatus | null>(null);
  const badgeClass: Record<PredStatus, string> = {
    open: 'text-brass border-brass',
    fulfilled: 'text-indigo border-indigo bg-indigo/5',
    missed: 'text-clay border-clay bg-clay/5',
    unclear: 'text-indigo-soft border-indigo-soft/40',
  };

  async function resolve(status: Exclude<PredStatus, 'open'>) {
    setBusy(status);
    try {
      const r = await api<{ prediction: PredictionData }>(
        `/api/predictions/${data.predictionId}/resolve`,
        { method: 'POST', body: JSON.stringify({ status, userNote: note || undefined }) },
      );
      onResolved({ ...data, ...r.prediction });
    } finally {
      setBusy(null);
    }
  }

  const windowStr =
    new Date(data.targetWindow.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
    ' → ' +
    new Date(data.targetWindow.to).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <div className="mt-2 bg-paper border border-indigo/10 p-4 rounded-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-indigo leading-relaxed">“{data.text}”</p>
        <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-1 whitespace-nowrap ${badgeClass[data.status]}`}>
          {data.status}
        </span>
      </div>
      <p className="mt-2 font-mono text-[11px] text-indigo-soft/70">
        {data.astrologerName ? `from ${data.astrologerName}` : 'from Sutra'} · window {windowStr}
      </p>
      {data.userNote && <p className="mt-2 text-sm text-indigo-soft italic">— {data.userNote}</p>}

      {data.status === 'open' && (
        <div className="mt-4 border-t border-indigo/10 pt-4">
          <label className="font-mono text-[11px] uppercase tracking-widest text-indigo-soft">how did it land?</label>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="Optional — what actually happened."
            className="mt-2 w-full bg-stone border border-indigo/20 px-3 py-2 text-indigo focus:border-brass outline-none resize-none text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <ResolveButton label="Fulfilled" busy={busy === 'fulfilled'} onClick={() => resolve('fulfilled')} />
            <ResolveButton label="Missed" busy={busy === 'missed'} onClick={() => resolve('missed')} kind="clay" />
            <ResolveButton label="Unclear" busy={busy === 'unclear'} onClick={() => resolve('unclear')} kind="soft" />
          </div>
        </div>
      )}
    </div>
  );
}

function ResolveButton({
  label, onClick, busy, kind = 'indigo',
}: {
  label: string; onClick: () => void; busy: boolean;
  kind?: 'indigo' | 'clay' | 'soft';
}) {
  const base = 'px-4 py-2 font-mono text-xs uppercase tracking-widest border transition disabled:opacity-40';
  const style =
    kind === 'clay'
      ? 'border-clay text-clay hover:bg-clay hover:text-paper'
      : kind === 'soft'
        ? 'border-indigo-soft/40 text-indigo-soft hover:border-indigo hover:text-indigo'
        : 'border-indigo text-indigo hover:bg-indigo hover:text-paper';
  return (
    <button onClick={onClick} disabled={busy} className={`${base} ${style}`}>
      {busy ? 'saving…' : label}
    </button>
  );
}
