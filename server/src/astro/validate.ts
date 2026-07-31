/**
 * GATE 1 numerical validation. Run: `npm --workspace server run validate:astro`
 *
 * Strategy: our sidereal output = library tropical − Lahiri ayanamsa. We prove each
 * factor independently, which is stronger than matching a single Vedic chart:
 *   1. Ayanamsa function matches published Lahiri values across epochs (±0.05°).
 *   2. Library ephemeris is correct: tropical reconstruction (sidereal + ayanamsa)
 *      matches published astro.com positions for Einstein (±1°).
 *   3. Ascendant sign is exact.
 *   4. deriveFeatures returns non-empty structured output for three users.
 */
import type { BirthData } from '@sutra/shared';
import { lahiriAyanamsa } from './ayanamsa.js';
import { computeNatalChart, absoluteLongitude } from './natal.js';
import { computeTransits, deriveFeatures } from './transits.js';
import { normalize360 } from './constants.js';

let failures = 0;
function check(label: string, pass: boolean, detail: string) {
  const tag = pass ? 'PASS' : 'FAIL';
  if (!pass) failures++;
  console.log(`  [${tag}] ${label}  ${detail}`);
}

// ─── 1. Ayanamsa vs published Lahiri ──────────────────────────────────────────
console.log('\n1. Lahiri ayanamsa vs published reference values');
const ayanRefs: { date: string; expected: number }[] = [
  { date: '1950-01-01T00:00:00Z', expected: 23.150 },
  { date: '2000-01-01T00:00:00Z', expected: 23.853 },
  { date: '2026-01-01T00:00:00Z', expected: 24.216 },
];
for (const r of ayanRefs) {
  const got = lahiriAyanamsa(new Date(r.date));
  check(
    `ayanamsa ${r.date.slice(0, 4)}`,
    Math.abs(got - r.expected) <= 0.05,
    `computed=${got.toFixed(3)}° expected=${r.expected}° Δ=${Math.abs(got - r.expected).toFixed(3)}°`,
  );
}

// ─── 2 & 3. Reference chart: Albert Einstein ──────────────────────────────────
// 1879-03-14 11:30 LMT, Ulm (48.40°N, 9.99°E). Published tropical positions (astro.com).
console.log('\n2. Reference chart — Albert Einstein (14 Mar 1879, 11:30, Ulm)');
const einstein: BirthData = {
  date: '1879-03-14', time: '11:30', lat: 48.40, lng: 9.99,
  tzOffset: 40, placeName: 'Ulm, Germany',
};
const chart = computeNatalChart(einstein);
const ayanEinstein = lahiriAyanamsa(new Date(Date.UTC(1879, 2, 14, 10, 50)));

// Published TROPICAL longitudes (degrees, 0..360).
const publishedTropical: Record<string, number> = {
  Sun: 353.500, Moon: 254.533, Mercury: 3.150, Venus: 16.983, Mars: 296.883,
};
console.log('  graha    sidereal(Lahiri)      trop(recon)  published   Δ');
for (const p of chart.planets) {
  if (!(p.body in publishedTropical)) continue;
  const sidAbs = absoluteLongitude(p);
  const tropRecon = normalize360(sidAbs + ayanEinstein);
  const exp = publishedTropical[p.body];
  let d = Math.abs(tropRecon - exp);
  if (d > 180) d = 360 - d;
  check(
    `${p.body.padEnd(8)} ${p.sign} ${p.degree.toFixed(2)}°`.padEnd(30),
    d <= 1.0,
    `recon=${tropRecon.toFixed(2)}° pub=${exp}° Δ=${d.toFixed(2)}°`,
  );
}
check('Ascendant sign exact', chart.ascendant === 'Gemini', `computed=${chart.ascendant} expected=Gemini`);

// ─── 4. deriveFeatures non-empty for three users ──────────────────────────────
console.log('\n3. deriveFeatures non-empty for three users');
const users: { name: string; b: BirthData }[] = [
  { name: 'Einstein', b: einstein },
  { name: 'Delhi 1995', b: { date: '1995-08-20', time: '14:30', lat: 28.61, lng: 77.21, tzOffset: 330, placeName: 'New Delhi' } },
  { name: 'Mumbai 1988', b: { date: '1988-11-05', time: '06:15', lat: 19.07, lng: 72.87, tzOffset: 330, placeName: 'Mumbai' } },
];
const today = new Date();
const transits = computeTransits(today);
for (const u of users) {
  const nc = computeNatalChart(u.b);
  const f = deriveFeatures(nc, transits);
  const ok = nc.planets.length === 9 && f.placements.length === 9 && f.aspects.length > 0;
  check(
    u.name.padEnd(14),
    ok,
    `asc=${nc.ascendant} planets=${nc.planets.length} placements=${f.placements.length} aspects=${f.aspects.length} moon=${f.moon.sign}/${f.moon.nakshatra}`,
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? '✅ GATE 1 PASS — all checks green' : `❌ ${failures} check(s) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
