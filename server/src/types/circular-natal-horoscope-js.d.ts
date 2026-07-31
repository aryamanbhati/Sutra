// Minimal type surface for the parts of circular-natal-horoscope-js we use.
// The package ships no types; we only touch tropical ecliptic longitudes + retrograde flags.
declare module 'circular-natal-horoscope-js' {
  interface OriginArgs {
    year: number;
    month: number; // 0-indexed (Jan = 0)
    date: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
  }
  export class Origin {
    constructor(args: OriginArgs);
  }

  interface Ecliptic {
    DecimalDegrees: number;
  }
  interface ChartPosition {
    Ecliptic: Ecliptic;
  }
  interface Body {
    key: string;
    label: string;
    ChartPosition: ChartPosition;
    isRetrograde: boolean;
  }
  interface HoroscopeArgs {
    origin: Origin;
    houseSystem?: string;
    zodiac?: 'tropical' | 'sidereal';
    aspectPoints?: string[];
    aspectWithPoints?: string[];
    aspectTypes?: string[];
    language?: string;
  }
  export class Horoscope {
    constructor(args: HoroscopeArgs);
    Ascendant: Body;
    CelestialBodies: { all: Body[] } & Record<string, Body>;
    CelestialPoints: { all: Body[] } & Record<string, Body>;
  }

  // The package is CommonJS: `module.exports = { Origin, Horoscope }`. Under NodeNext
  // ESM that surfaces as the default export, so we consume it via a default import.
  const _default: { Origin: typeof Origin; Horoscope: typeof Horoscope };
  export default _default;
}
