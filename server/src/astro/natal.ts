import type { BirthData, NatalChart, PlanetPosition } from '@sutra/shared';
import { computeChartRaw, type LocalTime } from './engine.js';
import {
  GRAHAS, BODY_KEY, SIGNS, signIndex, signOf, degreeInSign, wholeSignHouse,
} from './constants.js';

interface ParsedBirth {
  local: LocalTime;
  utc: Date;
}

/**
 * Split BirthData into the local wall-clock components the library needs, plus the
 * true UTC instant (from the stored tzOffset) used for the ayanamsa.
 */
export function parseBirth(b: BirthData): ParsedBirth {
  const [y, mo, d] = b.date.split('-').map(Number);
  const [hh, mm] = b.time.split(':').map(Number);
  const local: LocalTime = { year: y, month: mo - 1, date: d, hour: hh, minute: mm };
  // tzOffset is minutes east of UTC (IST = +330). UTC = wall-clock − offset.
  const utcMs = Date.UTC(y, mo - 1, d, hh, mm) - b.tzOffset * 60000;
  return { local, utc: new Date(utcMs) };
}

export function computeNatalChart(b: BirthData): NatalChart {
  const { local, utc } = parseBirth(b);
  const raw = computeChartRaw(local, b.lat, b.lng, utc);
  const ascIdx = signIndex(raw.ascendantSidereal);

  const planets: PlanetPosition[] = GRAHAS.map((g) => {
    const src = raw.bodies[BODY_KEY[g]];
    const idx = signIndex(src.lon);
    return {
      body: g,
      sign: SIGNS[idx],
      degree: degreeInSign(src.lon),
      house: wholeSignHouse(idx, ascIdx),
      retrograde: src.retrograde,
    };
  });

  return {
    ascendant: signOf(raw.ascendantSidereal),
    planets,
    computedAt: new Date().toISOString(),
  };
}

/** Reconstruct absolute sidereal longitude from a stored PlanetPosition. */
export function absoluteLongitude(p: PlanetPosition): number {
  return SIGNS.indexOf(p.sign) * 30 + p.degree;
}
