import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api, type SutraUser, type City } from '../lib/api';
import { Field } from './Login';

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!city) { setErr('Pick your birth place from the list.'); return; }
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ user: SutraUser }>('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          name, date, time,
          placeName: `${city.name}, ${city.state}`,
          lat: city.lat, lng: city.lng,
        }),
      });
      setUser(r.user);
      nav('/today');
    } catch {
      setErr('Could not compute your chart. Check the date and time.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs tracking-widest text-brass uppercase">sutra · your coordinates</p>
        <h1 className="mt-3 text-5xl leading-none text-indigo">Fix your position.</h1>
        <p className="mt-3 text-indigo-soft">
          Four measurements. From these, one chart — the spine everything else is read against.
        </p>
        <form onSubmit={submit} className="mt-8 bg-paper border border-indigo/15 p-7 rounded-sm space-y-4">
          <Field label="Name" value={name} onChange={setName} />
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-widest text-indigo-soft">Birth date</span>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="mt-1 w-full bg-stone border border-indigo/20 px-3 py-2 text-indigo font-mono focus:border-brass outline-none"
            />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-widest text-indigo-soft">Birth time</span>
            <input
              type="time" value={time} onChange={(e) => setTime(e.target.value)} required
              className="mt-1 w-full bg-stone border border-indigo/20 px-3 py-2 text-indigo font-mono focus:border-brass outline-none"
            />
            <span className="text-xs text-indigo-soft/70 mt-1 block">As exact as you can — the ascendant turns ~1° every 4 minutes.</span>
          </label>
          <CityPicker value={city} onPick={setCity} />
          {err && <p className="text-clay text-sm font-mono">{err}</p>}
          <button
            type="submit" disabled={busy}
            className="w-full bg-indigo text-paper py-3 font-mono text-sm uppercase tracking-widest hover:bg-indigo-soft transition disabled:opacity-50"
          >
            {busy ? 'Casting chart…' : 'Cast my chart'}
          </button>
        </form>
      </div>
    </main>
  );
}

function CityPicker({ value, onPick }: { value: City | null; onPick: (c: City) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q || (value && q === `${value.name}, ${value.state}`)) { setResults([]); return; }
    const id = setTimeout(() => {
      api<{ cities: City[] }>(`/api/cities?q=${encodeURIComponent(q)}`)
        .then((r) => { setResults(r.cities); setOpen(true); })
        .catch(() => setResults([]));
    }, 150);
    return () => clearTimeout(id);
  }, [q, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="block relative" ref={boxRef}>
      <span className="font-mono text-xs uppercase tracking-widest text-indigo-soft">Birth place</span>
      <input
        type="text" value={q} placeholder="Start typing a city…"
        onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)}
        className="mt-1 w-full bg-stone border border-indigo/20 px-3 py-2 text-indigo focus:border-brass outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-paper border border-indigo/20 shadow-lg max-h-56 overflow-auto">
          {results.map((c) => (
            <li key={`${c.name}-${c.state}`}>
              <button
                type="button"
                onClick={() => { onPick(c); setQ(`${c.name}, ${c.state}`); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-stone text-indigo"
              >
                {c.name}
                <span className="text-indigo-soft/70 text-sm"> · {c.state}</span>
                <span className="float-right font-mono text-xs text-brass">
                  {c.lat.toFixed(2)}°, {c.lng.toFixed(2)}°
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
