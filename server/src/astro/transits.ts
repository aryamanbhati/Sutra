import type { NatalChart, Graha, Sign } from '@sutra/shared';
import { computeChartRaw } from './engine.js';
import { absoluteLongitude } from './natal.js';
import {
  GRAHAS, BODY_KEY, SIGNS, ASPECTS, signIndex, signOf, degreeInSign,
  wholeSignHouse, nakshatraOf, normalize360,
} from './constants.js';

export interface TransitBody {
  body: Graha;
  sign: Sign;
  degree: number;
  lon: number; // sidereal
  retrograde: boolean;
}

export interface Transits {
  date: string; // YYYY-MM-DD (UTC)
  ayanamsa: number;
  moonSign: Sign;
  moonNakshatra: { name: string; pada: number };
  planets: TransitBody[];
}

/**
 * Current sidereal positions of the 9 grahas. Planetary ecliptic longitudes are
 * geocentric and effectively location-independent, so we evaluate at (0,0)/UTC.
 */
export function computeTransits(date: Date): Transits {
  const local = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    date: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
  const raw = computeChartRaw(local, 0, 0, date);

  const planets: TransitBody[] = GRAHAS.map((g) => {
    const s = raw.bodies[BODY_KEY[g]];
    return {
      body: g,
      sign: signOf(s.lon),
      degree: degreeInSign(s.lon),
      lon: s.lon,
      retrograde: s.retrograde,
    };
  });

  const moon = raw.bodies['moon'];
  return {
    date: date.toISOString().slice(0, 10),
    ayanamsa: raw.ayanamsa,
    moonSign: signOf(moon.lon),
    moonNakshatra: nakshatraOf(moon.lon),
    planets,
  };
}

export interface TransitPlacement {
  body: Graha;
  sign: Sign;
  degree: number;
  natalHouse: number; // which of the native's whole-sign houses this transit occupies
  retrograde: boolean;
}

export interface ActiveAspect {
  transit: Graha;
  natal: Graha;
  type: string;
  orb: number; // degrees from exact
}

export interface TransitFeatures {
  date: string;
  moon: { sign: Sign; nakshatra: string; pada: number };
  placements: TransitPlacement[];
  aspects: ActiveAspect[];
  saturnRahuContacts: string[]; // the heavy hitters, called out plainly
}

function angularSeparation(a: number, b: number): number {
  const d = Math.abs(normalize360(a) - normalize360(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * The structured facts that ground the daily reading. This is deliberately the ONLY
 * input the narrative model gets (Phase 3): features in, prose out, nothing invented.
 */
export function deriveFeatures(natal: NatalChart, transits: Transits): TransitFeatures {
  const ascIdx = SIGNS.indexOf(natal.ascendant);

  const placements: TransitPlacement[] = transits.planets.map((t) => ({
    body: t.body,
    sign: t.sign,
    degree: t.degree,
    natalHouse: wholeSignHouse(signIndex(t.lon), ascIdx),
    retrograde: t.retrograde,
  }));

  const aspects: ActiveAspect[] = [];
  for (const t of transits.planets) {
    for (const n of natal.planets) {
      const sep = angularSeparation(t.lon, absoluteLongitude(n));
      for (const asp of ASPECTS) {
        const orb = Math.abs(sep - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({ transit: t.body, natal: n.body, type: asp.name, orb: Number(orb.toFixed(2)) });
        }
      }
    }
  }
  aspects.sort((a, b) => a.orb - b.orb);

  const saturnRahuContacts = aspects
    .filter((a) => a.transit === 'Saturn' || a.transit === 'Rahu')
    .map((a) => `Transiting ${a.transit} ${a.type} natal ${a.natal} (orb ${a.orb}°)`);

  return {
    date: transits.date,
    moon: {
      sign: transits.moonSign,
      nakshatra: transits.moonNakshatra.name,
      pada: transits.moonNakshatra.pada,
    },
    placements,
    aspects,
    saturnRahuContacts,
  };
}
