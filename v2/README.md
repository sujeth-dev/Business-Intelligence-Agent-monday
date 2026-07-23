# Monday.com BI Agent — Skylark Drones Assignment

A conversational BI agent that answers founder-style questions over two
monday.com boards (Work Orders and Deals). Backend is Express + LangChain,
frontend is Next.js 14 with Tailwind.

## How it works

The backend pulls both boards from monday.com over GraphQL (paginated, with
a short in-memory cache). Nothing is hardcoded — board IDs and the API token
come from env vars. Rows get normalized, then all the actual math (pipeline
value, win rate, sector breakdowns, overdue work orders, receivables)
happens in plain JS before the LLM ever sees anything. The LLM only narrates
pre-computed numbers, so it can't make figures up.

Rough map of the backend services:

- `mondayService.js` — paginated GraphQL reads, 5-minute cache
- `normalizeService.js` — the messy-data layer. Parses several date formats,
  including raw Excel serial numbers like `46079` (these show up when a
  column wasn't imported as a proper Date type in monday.com). Also cleans
  up sector/service casing, strips currency formatting, treats `N/A` / `-` /
  blank as null, and drops the header rows that were re-pasted mid-sheet in
  the real Deals data.
- `biService.js` — computes the aggregates listed above
- `joinService.js` — links a deal to the work order(s) it became. Deals have
  a `Client Code` and Work Orders have a `Customer Name Code` with a `WO`
  prefix; strip the prefix and normalize, and they line up almost perfectly
  in the real data, so no fuzzy matching is needed.
- `timeframeService.js` — turns "this quarter" or "Q4 2023" into an actual
  date range and filters records against it before aggregating
- `queryService.js` — lightweight intent detection. If someone asks about
  "sectors" without naming one, it asks which sector they mean.
- `agentController.js` — wires everything into `/api/agent/chat`
  (multi-turn, timeframe-aware, can pull from both boards) and
  `/api/agent/leadership-summary`

The frontend has a chat panel (clarifying questions show up as clickable
chips, data caveats in a banner), a live data grid, and a "Generate
Leadership Update" button.

## Monday.com setup

1. Import `Work_Order_Tracker Data.csv` and `Deal funnel Data.csv` as two
   separate boards.
2. Get each board's numeric ID from its URL.
3. Generate a personal API token (monday.com → Avatar → Admin → API).
4. Put `MONDAY_WORKORDERS_BOARD_ID`, `MONDAY_DEALS_BOARD_ID` and
   `MONDAY_API_TOKEN` in `backend/.env` (there's a `.env.example` to copy).

## Running locally

```
cp backend/.env.example backend/.env       # fill in real values
cp frontend/.env.local.example frontend/.env.local
make develop      # installs both, backend on :5000, frontend on :3000
make test         # backend lint + unit tests, frontend lint
```

## Deployment

This is how the hosted version is set up.

**Backend on Railway:**

1. Push the repo to GitHub, then Railway → New Project → Deploy from GitHub
   repo.
2. Set the service's Root Directory to `backend`. Railway picks up the Node
   app on its own and runs `npm install` + `npm start`.
3. Optionally set the healthcheck path to `/health` under Networking.
4. Add the variables: `MONDAY_API_TOKEN`, `MONDAY_WORKORDERS_BOARD_ID`,
   `MONDAY_DEALS_BOARD_ID`, `LLM_PROVIDER` (`groq` / `openai` /
   `openrouter`) plus the matching API key, and `FRONTEND_ORIGIN` (fill this
   in after the Vercel deploy below).
5. Generate a public domain under Networking and note the URL.

**Frontend on Vercel:**

1. New Project → same repo, Root Directory `frontend`.
2. Set `NEXT_PUBLIC_API_URL` to the Railway backend URL.
3. Deploy, then go back to Railway, set `FRONTEND_ORIGIN` to the Vercel URL
   and redeploy so CORS allows it.

If you have the Vercel CLI installed and logged in, `make deploy` runs
`vercel --prod` from `frontend/`. The backend redeploys on git push either
way. CI (`.github/workflows/ci.yml`) runs backend lint + tests and a
frontend lint + build on every push to `main`.

## What was tested

- 5 backend unit test suites (normalize, bi, query, timeframe, join), all
  passing. Lint clean on both sides, frontend production build passes with
  TypeScript checks.
- End-to-end against the live boards (344 deals, 176 work orders) with real
  Groq calls: sector-scoped, multi-metric, timeframe-scoped and
  cross-board questions, the leadership summary, and a full clarification
  round-trip.
- Invalid input to the API returns a JSON error instead of crashing.

## Known gaps

See `docs/DECISION_LOG.md` for details, but in short: the cross-board join
is exact-match only (no fuzzy fallback), there's no regression eval set for
numeric accuracy yet, and the cache is per-process.
