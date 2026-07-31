/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stone: '#E8DCC8',
        paper: '#F5EFE3',
        indigo: {
          DEFAULT: '#1B2A4A',
          soft: '#2E4370',
        },
        brass: '#B08948',
        ink: '#14171F',
        clay: '#9C5B3F',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        body: ['Karla', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
