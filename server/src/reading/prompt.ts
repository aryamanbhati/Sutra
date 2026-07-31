import type { TransitFeatures } from '../astro/transits.js';

// The architectural claim: structured features → constrained narration. The model
// receives ONLY the facts below and must narrate them; it is forbidden from inventing
// astrological data. Cheaper than open generation and non-hallucinating by construction.
export const SYSTEM_PROMPT = `You are the daily-reading voice of Sutra, a Vedic astrology instrument.

You will be given a set of STRUCTURED ASTROLOGICAL FACTS computed for one person on one day — transiting planets in their natal houses, active aspects, the Moon's sign and nakshatra, and any Saturn/Rahu contacts. These facts are the ground truth.

Your task: narrate ONLY these facts as a short, grounded daily reading (110–170 words).

Hard rules:
- Never invent a placement, aspect, sign, house, or planet that is not in the facts. If it is not given, it does not exist for this reading.
- Do not predict specific external events ("you will get a call"). Speak to inner weather, tendencies, and what to attend to — reflective, not fortune-telling.
- Reference the actual data: name the transiting planet, the house it occupies, the Moon's nakshatra. Traceability is the point.
- Tone: precise and warm, like a measured observer. No mysticism, no purple prose, no emoji, no headers. Plain paragraphs.
- Do not restate the raw numbers as a list; weave them into prose.
- End with one concrete, gentle suggestion for the day that follows from the facts.`;

const HOUSE_THEME: Record<number, string> = {
  1: 'self, body, how you meet the day',
  2: 'resources, speech, what you value',
  3: 'effort, courage, communication',
  4: 'home, roots, inner ground',
  5: 'mind, creativity, expression',
  6: 'work, routine, obstacles',
  7: 'others, partnership, agreements',
  8: 'change, depth, the hidden',
  9: 'meaning, belief, the wider view',
  10: 'action in the world, standing',
  11: 'gains, networks, hopes',
  12: 'rest, release, the interior',
};

export function featuresToPromptInput(f: TransitFeatures, name: string): string {
  const lines: string[] = [];
  lines.push(`PERSON: ${name}`);
  lines.push(`DATE: ${f.date}`);
  lines.push(`MOON: ${f.moon.sign}, nakshatra ${f.moon.nakshatra} (pada ${f.moon.pada})`);
  lines.push('');
  lines.push('TRANSITING PLANETS BY NATAL HOUSE:');
  for (const p of f.placements) {
    lines.push(
      `- ${p.body} in ${p.sign}${p.retrograde ? ' (retrograde)' : ''} → your house ${p.natalHouse} (${HOUSE_THEME[p.natalHouse]})`,
    );
  }
  if (f.aspects.length) {
    lines.push('');
    lines.push('ACTIVE ASPECTS (tightest first):');
    for (const a of f.aspects.slice(0, 6)) {
      lines.push(`- transiting ${a.transit} ${a.type} natal ${a.natal} (orb ${a.orb}°)`);
    }
  }
  if (f.saturnRahuContacts.length) {
    lines.push('');
    lines.push('SATURN / RAHU CONTACTS (weight these):');
    for (const c of f.saturnRahuContacts) lines.push(`- ${c}`);
  }
  return lines.join('\n');
}

/** Deterministic grounded reading when no API key is set. Uses only the facts. */
export function fallbackNarrative(f: TransitFeatures, name: string): string {
  const moon = `Today the Moon moves through ${f.moon.sign}, in the nakshatra of ${f.moon.nakshatra}. `;
  const strongest = f.placements.find((p) => p.body === 'Moon') ?? f.placements[0];
  const house = strongest
    ? `Transiting ${strongest.body} sits in your ${ordinal(strongest.natalHouse)} house — ${HOUSE_THEME[strongest.natalHouse]} — so that is where your attention naturally gathers. `
    : '';
  const aspect = f.aspects[0]
    ? `A close ${f.aspects[0].type} links transiting ${f.aspects[0].transit} and your natal ${f.aspects[0].natal} today (${f.aspects[0].orb}° from exact), coloring the tone. `
    : '';
  const heavy = f.saturnRahuContacts[0]
    ? `${f.saturnRahuContacts[0]} — a slower, weightier thread worth naming rather than pushing against. `
    : '';
  const close = 'Let the day be observed more than forced; note what the chart is already showing you.';
  return (moon + house + aspect + heavy + close).trim();
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
