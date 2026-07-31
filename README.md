# Sutra

**The thread through your chart.** A persistent-memory astrology platform built for
AstroHack 2026 (AstroLive Challenge).

### 🔗 Live

| | URL |
|---|---|
| **App** | **https://sutra-client.vercel.app** |
| API health | https://sutra-78qz.onrender.com/api/health |
| Demo login | `demo@sutra.app` / `demo1234` (surfaced on the login screen) |

> Backend runs on Render's free tier and sleeps after 15 min idle — the first request
> may take ~30–50s to wake. Once awake, subsequent requests are instant.

---

## The thesis (one paragraph)

The astrology consultation category has an **amnesia defect**: every call starts from
zero. Users re-explain their life each time, receive contradictory advice from different
astrologers, and churn. This is the mechanical root cause of both the industry's
retention problem and the "they're just guessing" perception dominating category reviews.

Sutra builds the persistent-memory layer the category lacks — one data spine (the **Life
File**) consumed by three surfaces:

1. **A daily habit loop** — a check-in and a chart-grounded reading, one per day
2. **An astrologer context brief** — pre-consult, everything they'd otherwise re-ask
3. **AI products** — zero-marginal-cost narration grounded in the user's own chart

Continuity creates switching cost (retention), traceable predictions (trust), and
revenue that doesn't consume astrologer minutes (margin).

---

## Architecture

```
                       [ Vercel — static SPA ]
                                │
                                │  HTTPS
                                ▼
              [ Render — Node/Express (Docker) ]
                     ┌──────┬──────┬──────┐
                     ▼      ▼      ▼      ▼
                  Atlas  Upstash  Groq  circular-natal-horoscope-js
                 (Mongo) (Redis) (LLM)   (sidereal, own Lahiri ayanamsa)
```

**Split by cost curve, not tradition:** the frontend is static → CDN; the backend
is a long-running process → containers. Each scales on its own economics.

**The daily-loop cascade** (`GET /api/today`):

1. Check Redis (`reading:{userId}:{YYYY-MM-DD}`) → hit → return (~1ms)
2. Miss → check Mongo → found → backfill Redis, return
3. Not found → compute transit features → generate narrative → persist both → return

**Grounded generation:** the LLM receives *only* structured transit features and is
forbidden from inventing astrology. Every claim in a reading traces to a real position
in the chart. Deterministic fallback narrator when no key — the app always works.

**Astro engine gotcha (documented in code):** `circular-natal-horoscope-js` ships a
fixed 24.1° "sidereal" offset that is **not** true Lahiri (which precesses ~50.3″/yr).
Sutra uses the library's accurate *tropical* ephemeris and applies its own time-varying
Lahiri ayanamsa — matched to reference values within 0.05°.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 · Vite · TypeScript · Tailwind · React Router |
| Backend | Node 20 · Express · TypeScript · Mongoose · Zod |
| Database | MongoDB Atlas |
| Cache | Upstash Redis (REST — plays well with cold-starting hosts) |
| Astro engine | `circular-natal-horoscope-js` (sidereal, our own Lahiri ayanamsa) |
| Narrative LLM | Groq (`llama-3.3-70b-versatile`) — OpenAI-compatible fast inference |
| Frontend host | Vercel |
| Backend host | Render (Docker) |

---

## Local setup

```bash
git clone https://github.com/aryamanbhati/sutra.git
cd sutra
cp .env.example .env   # fill MONGO_URI, UPSTASH_*, GROQ_API_KEY, JWT_SECRET
npm install
npm run dev            # server on :8080, client on :5173
```

Then seed the demo account:

```bash
npm run seed           # creates demo@sutra.app / demo1234 with 28 days of history
```

---

## Deploy

- **Frontend → Vercel** — root dir `client/`, Vite preset. `VITE_API_URL` in `client/.env.production`.
- **Backend → Render** — Docker (`server/Dockerfile`). Set env vars: `MONGO_URI`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `JWT_SECRET`, `CORS_ORIGIN` (the Vercel URL, exact), `GROQ_API_KEY`.
- **DB → MongoDB Atlas** — separate database, share cluster.
- **Cache → Upstash Redis** — REST tier, AP-South-1.

---

## AI tools disclosure

Per the hackathon's disclosure requirement:

**In the product:**
- **Groq** (`llama-3.3-70b-versatile`, via its OpenAI-compatible API) generates the
  daily reading narrative. Prompting is strictly grounded — the model receives only
  the structured transit features Sutra computes, with a system prompt forbidding
  invention of astrological facts.
- Model choice reflects the cost thesis of the product itself: readings are
  a per-user-per-day operation and must run at open-model economics.

**In development:**
- **Anthropic Claude (Claude Code)** was used as a build assistant for iterating on
  code, debugging, and documentation.

No AI tools were used to generate astrological content that reaches the user without
passing through the grounded-narration constraint above.

---

## Demo walkthrough (60 seconds)

1. Open the live app → the login screen surfaces **`demo@sutra.app / demo1234`**
2. Click **sign in as demo** → land on **Today**
3. See the kundli square + a chart-grounded reading (references your actual transits) + a 28-day streak
4. Click **life file** → the merged timeline: 28 check-ins, 3 consultations, 4 predictions (2 fulfilled, 1 open, 1 missed)
5. At the top of the timeline: **observed pattern in your log** — *"You logged
   'anxious' on 3 of the 3 days the Moon transited your 12th house."* Sample size
   in Space Mono. Framed as an observed pattern, never as prediction or cause.
6. Click **console** → the astrologer's pre-consult brief with `CONTEXT LOAD: 0:00 · PREVIOUSLY ~5:00` — the commercial claim, on screen, as a measurement.

---

## The design language — "instrument, not oracle"

The category default (dark purple, nebula gradients, twinkling stars) signals mysticism
and undermines a product whose entire argument is precision and trust. Sutra references
the **Jantar Mantar observatory** and the **North Indian kundli square**: sandstone
ground, deep indigo, restrained brass. `Instrument Serif` for display, `Karla` for
body, and `Space Mono` for every measurement — degrees, coordinates, streak counts,
sample sizes. Data rendered as *measurements* is the single strongest signal of the
thesis.

The North Indian kundli square is the recurring geometric motif — natal chart, daily
transit, streak visualization — built once as a reusable SVG component.
