# Monday.com BI Agent — Skylark Drones Assignment

A conversational business-intelligence agent over two monday.com boards
(Work Orders, Deals). Backend: Express + LangChain (`ChatOpenAI`).
Frontend: Next.js 14 (App Router) + Tailwind + Framer Motion + Zustand.

## Architecture
- **backend/services/mondayService.js** — dynamic, paginated GraphQL reads
  from monday.com. No hardcoded board data; board IDs come from env vars.
- **backend/services/normalizeService.js** — cleans real-world messy data:
  parses multiple date formats (including raw Excel serial-number dates,
  which the source trackers use when a column wasn't imported as a proper
  Date type), maps the real Skylark Drones sector/service values (Renewables,
  Mining, Railways, Powerline, Construction, DSP, Tender, Manufacturing,
  Security and Surveillance, Aviation, Others) to a canonical casing, strips
  currency formatting from numbers, treats `N/A`/blank/`-` as null, and drops
  stray re-pasted-header rows (a real artifact found in the source data).
- **backend/services/biService.js** — computes real aggregates (pipeline
  value, win rate via the real `Deal Status` field, sector breakdown, overdue
  work orders via `Execution Status` + `Probable End Date`, outstanding
  receivables) so the LLM narrates numbers instead of inventing them.
- **backend/services/joinService.js** — links a Deal to the Work Order(s) it
  converted into, by normalizing Deals' `Client Code` and Work Orders'
  `Customer Name Code` (stripping the `WO` prefix) to a shared key — verified
  against the real data to match exactly, so no fuzzy name matching is used.
- **backend/services/timeframeService.js** — resolves a detected timeframe
  keyword ("this quarter", "Q4 2023", etc.) into an actual UTC date range and
  filters deals/work orders against it before aggregation, instead of only
  mentioning the timeframe to the LLM as text.
- **backend/services/queryService.js** — lightweight intent detection
  (sector/timeframe/year/metric) that triggers a clarifying question when a
  query references "sector" generically and the data has more than one
  sector.
- **backend/controllers/agentController.js** — orchestrates the above into
  `/api/agent/chat` (conversational, multi-turn via client-supplied
  history, timeframe-filtered, cross-board-aware) and
  `/api/agent/leadership-summary` (bullet-point exec update).
- **frontend/** — chat panel (with clickable clarification chips and a data
  caveats banner) + live data grid + an on-demand "Generate Leadership
  Update" panel, all hitting the backend's `/api/agent/*` and `/api/data/*`
  routes.

## Monday.com setup
1. Import `Work_Order_Tracker Data.csv` and `Deal funnel Data.csv` as two
   separate boards in monday.com.
2. Grab each board's numeric ID from its URL.
3. Generate a personal API token: monday.com → Avatar → Admin → API.
4. Set `MONDAY_WORKORDERS_BOARD_ID`, `MONDAY_DEALS_BOARD_ID`, and
   `MONDAY_API_TOKEN` in `backend/.env` (copy from `.env.example`).

## Local development
```
cp backend/.env.example backend/.env       # fill in real values
cp frontend/.env.local.example frontend/.env.local
make develop      # npm install both, start backend :5000 and frontend :3000
make test         # lint + unit tests for backend, lint for frontend
```

## Deployment (tested end-to-end)

### Backend → Render
1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → select the repo. It reads
   `render.yaml` at the root (`rootDir: backend`, build `npm install`,
   start `node server.js`, health check `/health`).
3. Fill in the env vars Render prompts for: `MONDAY_API_TOKEN`,
   `MONDAY_WORKORDERS_BOARD_ID`, `MONDAY_DEALS_BOARD_ID`, `OPENAI_API_KEY`,
   `FRONTEND_ORIGIN` (set this once you have the Vercel URL, comma-separate
   multiple origins if needed).
4. Deploy. Note the live URL, e.g. `https://bi-agent-backend.onrender.com`.
5. *(Optional automation)* Render → your service → Settings → Deploy Hook
   → copy the URL → `export RENDER_DEPLOY_HOOK_URL=...` → `make deploy`
   will curl it automatically from then on.

### Frontend → Vercel
1. Vercel dashboard → **New Project** → select the repo. Set **Root
   Directory** to `frontend` (it auto-detects Next.js via `vercel.json`).
2. Add env var `NEXT_PUBLIC_API_URL` = the live Render backend URL from
   above.
3. Deploy. Note the live URL, e.g. `https://bi-agent.vercel.app`.
4. Go back to Render and set `FRONTEND_ORIGIN` to this Vercel URL, then
   redeploy the backend so CORS allows it.
5. *(Optional automation)* `npm i -g vercel && vercel login`, then
   `make deploy` will run `vercel --prod --yes` from `frontend/` if the
   CLI is installed and logged in.

### One-shot
```
make all      # clean -> develop -> test -> deploy
```

### CI
`.github/workflows/ci.yml` runs backend lint+tests and frontend
lint+build on every push/PR to `main`.

## Verified locally before packaging
- `npm test` in `backend/` — 3 suites (biService, normalizeService,
  queryService), all passing.
- `npm run lint` — clean in both `backend/` and `frontend/` (ESLint 9 flat
  config for backend, `next lint` for frontend).
- `npm run build` in `frontend/` — production build succeeds with full
  TypeScript checking.
- Backend boots and returns graceful, non-crashing JSON errors when
  monday.com/OpenAI credentials are absent (verified via curl against a
  running instance).

## Known gaps (see docs/DECISION_LOG.md)
- The cross-board join matches on client code only; it doesn't fall back to
  fuzzy name matching if a future data refresh has a lower exact-match rate
  than the ~98% verified against the real dataset.
- No proper eval set of founder-style questions with expected answer shapes
  for regression-testing numeric accuracy over time (see Decision Log).
- Caching is in-memory (single instance) — see Decision Log for the tradeoff.
