# Sutra

Persistent-memory astrology platform. Built for AstroHack 2026 (AstroLive Challenge).

Thesis: the category loses users to *amnesia* — every consultation starts from zero. Sutra builds a
single Life File consumed by three surfaces (daily loop, astrologer brief, AI products) so
continuity creates retention, trust, and margin.

## Stack
- Frontend: React 18 + Vite + TypeScript + Tailwind
- Backend: Node 20 + Express + TypeScript
- DB: MongoDB Atlas · Cache: Upstash Redis
- Astro engine: `circular-natal-horoscope-js` (sidereal, Lahiri)
- Narrative: Anthropic Claude (grounded generation)

## Local setup
```bash
cp .env.example .env   # fill secrets
npm install
npm run dev
```
Frontend on http://localhost:5173, backend on http://localhost:8080, health at `/api/health`.

## Deploy
- Frontend → Vercel
- Backend → Railway
- DB → MongoDB Atlas · Cache → Upstash

## AI tools used
- Anthropic Claude (Sonnet) for grounded daily-reading narration and for build assistance during development.

## Demo
See login screen for demo credentials once Phase 6 seed is run.
