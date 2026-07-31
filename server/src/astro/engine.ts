import CNH from 'circular-natal-horoscope-js';
const { Origin, Horoscope } = CNH;
import { lahiriAyanamsa } from './ayanamsa.js';
import { normalize360 } from './constants.js';

export interface RawPos {
  lon: number; // sidereal ecliptic longitude, 0..360
  retrograde: boolean;
}

export interface ChartRaw {
  ascendantSidereal: number;
  bodies: Record<string, RawPos>; // keyed by library key: sun, moon, ..., northnode, southnode
  ayanamsa: number;
}

export interface LocalTime {
  year: number;
  month: number; // 0-indexed
  date: number;
  hour: number;
  minute: number;
}

/**
 * Compute a sidereal (Lahiri) chart. We ask the library for TROPICAL positions —
 * whose underlying ephemeris is accurate to arcminutes — then subtract our own
 * time-varying Lahiri ayanamsa. `utcInstant` is used only for the ayanamsa (which
 * drifts imperceptibly within a day); the library derives its own timezone from
 * lat/lng for the ephemeris.
 */
export function computeChartRaw(
  local: LocalTime,
  lat: number,
  lng: number,
  utcInstant: Date,
): ChartRaw {
  const origin = new Origin({
    year: local.year,
    month: local.month,
    date: local.date,
    hour: local.hour,
    minute: local.minute,
    latitude: lat,
    longitude: lng,
  });
  const horoscope = new Horoscope({
    origin,
    houseSystem: 'whole-sign',
    zodiac: 'tropical',
    aspectTypes: ['major'],
    language: 'en',
  });

  const ayanamsa = lahiriAyanamsa(utcInstant);
  const bodies: Record<string, RawPos> = {};

  for (const b of horoscope.CelestialBodies.all) {
    bodies[b.key] = {
      lon: normalize360(b.ChartPosition.Ecliptic.DecimalDegrees - ayanamsa),
      // Sun/Moon are never retrograde and the library reports `undefined` for them,
      // so coerce to a real boolean.
      retrograde: Boolean(b.isRetrograde),
    };
  }
  // Lunar nodes live under CelestialPoints, not CelestialBodies. They are always
  // retrograde by convention (mean node).
  for (const key of ['northnode', 'southnode']) {
    const p = horoscope.CelestialPoints[key];
    bodies[key] = {
      lon: normalize360(p.ChartPosition.Ecliptic.DecimalDegrees - ayanamsa),
      retrograde: true,
    };
  }

  return {
    ascendantSidereal: normalize360(
      horoscope.Ascendant.ChartPosition.Ecliptic.DecimalDegrees - ayanamsa,
    ),
    bodies,
    ayanamsa,
  };
}
