import type { NatalChart, Graha } from '@sutra/shared';

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const ABBR: Record<Graha, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

// Standard North Indian layout. Houses are FIXED positions; H1 (lagna) is top-center,
// numbering runs counter-clockwise. Coordinates on a 300×300 grid.
const HOUSE_ANCHOR: Record<number, { x: number; y: number }> = {
  1: { x: 150, y: 78 }, 2: { x: 75, y: 40 }, 3: { x: 40, y: 78 },
  4: { x: 78, y: 150 }, 5: { x: 40, y: 222 }, 6: { x: 75, y: 260 },
  7: { x: 150, y: 222 }, 8: { x: 225, y: 260 }, 9: { x: 260, y: 222 },
  10: { x: 222, y: 150 }, 11: { x: 260, y: 78 }, 12: { x: 225, y: 40 },
};

// Where the small sign-number sits inside each house (offset toward the outer edge).
const SIGN_ANCHOR: Record<number, { x: number; y: number }> = {
  1: { x: 150, y: 40 }, 2: { x: 40, y: 20 }, 3: { x: 18, y: 60 },
  4: { x: 40, y: 150 }, 5: { x: 18, y: 240 }, 6: { x: 40, y: 282 },
  7: { x: 150, y: 260 }, 8: { x: 260, y: 282 }, 9: { x: 282, y: 240 },
  10: { x: 260, y: 150 }, 11: { x: 282, y: 60 }, 12: { x: 260, y: 20 },
};

export function KundliSquare({ chart, size = 320 }: { chart: NatalChart; size?: number }) {
  const ascIndex = SIGNS.indexOf(chart.ascendant);

  const planetsByHouse: Record<number, { g: Graha; retro: boolean }[]> = {};
  for (const p of chart.planets) {
    (planetsByHouse[p.house] ??= []).push({ g: p.body, retro: p.retrograde });
  }

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      role="img"
      aria-label={`North Indian kundli chart, ${chart.ascendant} ascendant`}
      className="max-w-full"
    >
      {/* structure */}
      <g stroke="#1B2A4A" strokeWidth={1.2} fill="none">
        <rect x={0} y={0} width={300} height={300} />
        <line x1={0} y1={0} x2={300} y2={300} />
        <line x1={300} y1={0} x2={0} y2={300} />
        <polygon points="150,0 300,150 150,300 0,150" />
      </g>

      {Array.from({ length: 12 }, (_, i) => {
        const house = i + 1;
        const signNumber = ((ascIndex + i) % 12) + 1;
        const sa = SIGN_ANCHOR[house];
        const ha = HOUSE_ANCHOR[house];
        const planets = planetsByHouse[house] ?? [];
        const startY = ha.y - (planets.length - 1) * 6;
        return (
          <g key={house}>
            <text
              x={sa.x} y={sa.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fill="#B08948"
              fontFamily='"Space Mono", monospace'
            >
              {signNumber}
            </text>
            {planets.map((p, j) => (
              <text
                key={p.g}
                x={ha.x} y={startY + j * 13}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={12} fill="#1B2A4A"
                fontFamily='"Space Mono", monospace'
              >
                {ABBR[p.g]}{p.retro ? '℞' : ''}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
