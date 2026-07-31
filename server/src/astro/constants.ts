import type { Sign, Graha } from '@sutra/shared';

export const SIGNS: Sign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// The 9 grahas of Vedic astrology, in traditional order.
export const GRAHAS: Graha[] = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu',
];

// Map each graha to its source key in the library.
// Rahu/Ketu are the lunar nodes (not "planets" in the library's CelestialBodies).
export const BODY_KEY: Record<Graha, string> = {
  Sun: 'sun',
  Moon: 'moon',
  Mars: 'mars',
  Mercury: 'mercury',
  Jupiter: 'jupiter',
  Venus: 'venus',
  Saturn: 'saturn',
  Rahu: 'northnode',
  Ketu: 'southnode',
};

// 27 nakshatras (lunar mansions), each spanning 13°20' of the sidereal zodiac.
export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

export const NAKSHATRA_ARC = 360 / 27; // 13.3333° = 13°20'

// Major aspects with orbs (degrees). Vedic uses whole-sign drishti too, but for
// transit "activity" we use classical angular aspects with tight orbs.
export const ASPECTS: { name: string; angle: number; orb: number }[] = [
  { name: 'conjunction', angle: 0, orb: 8 },
  { name: 'opposition', angle: 180, orb: 8 },
  { name: 'trine', angle: 120, orb: 6 },
  { name: 'square', angle: 90, orb: 6 },
];

export function normalize360(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export function signIndex(siderealLon: number): number {
  return Math.floor(normalize360(siderealLon) / 30);
}

export function signOf(siderealLon: number): Sign {
  return SIGNS[signIndex(siderealLon)];
}

export function degreeInSign(siderealLon: number): number {
  return normalize360(siderealLon) % 30;
}

// Whole-sign house: house 1 is the ascendant's sign, counting forward.
export function wholeSignHouse(bodySignIndex: number, ascSignIndex: number): number {
  return ((bodySignIndex - ascSignIndex + 12) % 12) + 1;
}

export function nakshatraOf(siderealLon: number): { name: string; pada: number } {
  const lon = normalize360(siderealLon);
  const idx = Math.floor(lon / NAKSHATRA_ARC);
  const within = lon - idx * NAKSHATRA_ARC;
  const pada = Math.floor(within / (NAKSHATRA_ARC / 4)) + 1;
  return { name: NAKSHATRAS[idx], pada };
}
