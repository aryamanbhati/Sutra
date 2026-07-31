export type Sign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Graha =
  | 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter'
  | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

export interface BirthData {
  date: string;      // YYYY-MM-DD
  time: string;      // HH:mm (24h, local to birth place)
  lat: number;
  lng: number;
  tzOffset: number;  // minutes from UTC at birth
  placeName: string;
}

export interface PlanetPosition {
  body: Graha;
  sign: Sign;
  degree: number;    // 0..30 within sign
  house: number;     // 1..12
  retrograde: boolean;
}

export interface NatalChart {
  ascendant: Sign;
  planets: PlanetPosition[];
  computedAt: string; // ISO
}

export type Mood = 'calm' | 'anxious' | 'hopeful' | 'low' | 'energised' | 'unsettled';

export interface HealthResponse {
  ok: boolean;
  db: boolean;
  redis: boolean;
  version: string;
  time: string;
}
