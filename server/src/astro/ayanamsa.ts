// Lahiri (Chitrapaksha) ayanamsa — the Vedic standard, and the value the government
// of India's Rashtriya Panchang uses.
//
// The bundled `circular-natal-horoscope-js` applies a FIXED 24.100° offset for its
// "sidereal" mode, which is astronomically wrong: the true ayanamsa precesses ~50.29"
// per year. So we ignore the library's sidereal mode, take its (accurate) tropical
// longitudes, and subtract a properly time-varying Lahiri ayanamsa computed here.
//
// Model: linear precession anchored at J2000.0.
//   ayanamsa(J2000.0) = 23°51'11" = 23.85306°
//   rate              = 50.2388"/yr = 0.01395522°/yr
// Accurate to ~1 arcminute across 1900–2100 — comfortably inside GATE 1's ±1° tolerance.

const LAHIRI_AT_J2000 = 23.85306; // degrees
const PRECESSION_DEG_PER_YEAR = 50.2388 / 3600;
const JD_J2000 = 2451545.0;
const UNIX_EPOCH_JD = 2440587.5;
const DAYS_PER_JULIAN_YEAR = 365.25;

/** Julian Date from a JS Date (UTC). */
export function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + UNIX_EPOCH_JD;
}

/** Lahiri ayanamsa in degrees for the given instant. */
export function lahiriAyanamsa(date: Date): number {
  const yearsFromJ2000 = (toJulianDate(date) - JD_J2000) / DAYS_PER_JULIAN_YEAR;
  return LAHIRI_AT_J2000 + PRECESSION_DEG_PER_YEAR * yearsFromJ2000;
}
