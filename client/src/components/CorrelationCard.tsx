import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Ready {
  ready: true;
  mood: string;
  house: number;
  houseTheme: string;
  matches: number;
  daysWithHouse: number;
  totalCheckIns: number;
}
interface Pending {
  ready: false;
  totalCheckIns: number;
  needed: number;
  reason: 'insufficient_data' | 'no_pattern';
}
type CorrelationResult = Ready | Pending;

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * The correlation payoff. Deliberately framed as "your own log" — an observed
 * pattern in the user's data, never a claim about causation. Sample size shown
 * in Space Mono because the sample size IS the credibility of the claim.
 */
export function CorrelationCard() {
  const [data, setData] = useState<CorrelationResult | null>(null);
  useEffect(() => {
    api<CorrelationResult>('/api/insights/correlation').then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  if (!data.ready) {
    return (
      <aside className="bg-paper border border-indigo/15 p-5 rounded-sm">
        <p className="font-mono text-xs uppercase tracking-widest text-brass">observed patterns</p>
        <p className="mt-2 text-sm text-indigo-soft">
          {data.reason === 'insufficient_data'
            ? `Sutra needs ${data.needed} more check-in${data.needed === 1 ? '' : 's'} before it will suggest a pattern in your log.`
            : 'Not yet enough concentration in your log to point to a pattern honestly.'}
        </p>
        <p className="mt-2 font-mono text-[11px] text-indigo-soft/60">
          check-ins on file: {String(data.totalCheckIns).padStart(2, '0')} · minimum: 08
        </p>
      </aside>
    );
  }

  return (
    <aside className="bg-paper border border-indigo/15 p-5 rounded-sm">
      <p className="font-mono text-xs uppercase tracking-widest text-brass">observed pattern in your log</p>
      <p className="mt-3 text-lg text-indigo leading-relaxed">
        You logged{' '}
        <span className="font-display text-2xl">{data.mood}</span>{' '}
        on <span className="font-mono">{data.matches}</span> of the{' '}
        <span className="font-mono">{data.daysWithHouse}</span> days the Moon transited your{' '}
        <span className="font-display text-2xl">{ordinal(data.house)}</span> house{data.houseTheme && <span className="text-indigo-soft"> ({data.houseTheme})</span>}.
      </p>
      <p className="mt-3 font-mono text-[11px] text-indigo-soft/70">
        n = {data.totalCheckIns} check-ins · {data.matches}/{data.daysWithHouse} in bin
      </p>
      <p className="mt-1 text-xs text-indigo-soft/60 italic">
        An observed pattern in your own log — not a prediction, not a claim about cause.
      </p>
    </aside>
  );
}
