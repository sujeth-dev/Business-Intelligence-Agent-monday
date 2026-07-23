# Decision Log

## Key assumptions
- Monday.com board IDs and API token are supplied via environment variables
  only — never hardcoded — per the "do not hardcode CSV data, query
  dynamically" requirement.
- Work Orders and Deals are the sole data sources; no other integrations
  (e.g. accounting, CRM) are wired in this pass.
- Column identification prefers an exact real column title (`Deal Status`,
  `Client Code`, `Probable End Date`, etc. — verified against the actual
  `Deal funnel Data.xlsx` / `Work_Order_Tracker Data.xlsx` source files and
  the live monday.com board schema) before falling back to substring-hint
  matching. Several real columns share overlapping words — `Deal Status` vs
  `Deal Stage`, or five different "...Date" columns on the Work Orders
  board — so hint-matching alone (picking whichever column happens to match
  first) is not reliable once more than one plausible column exists;
  exact-title-first with a hint fallback keeps both accuracy and resilience
  to minor schema drift.
- The real sector/service taxonomy (Renewables, Mining, Railways, Powerline,
  Construction, DSP, Tender, Manufacturing, Security and Surveillance,
  Aviation, Others) replaces an earlier, incorrect assumption that sectors
  would look like generic business categories (Energy/Agriculture/Telecom/
  Government) — that assumption was made before the real files were
  inspected and has been discarded entirely.
- Dates in the source trackers are sometimes raw Excel serial-day numbers
  (e.g. `46079`) rather than formatted text, when a column wasn't imported
  as a proper monday.com Date type. `normalizeService.parseDate` falls back
  to decoding these (bounded to a plausible ~1954–2064 range so an ordinary
  numeric field, like a quantity, is never misread as a date).
- Two rows in the real Deals source file are corrupted — a header row
  re-pasted mid-sheet, where the cell values are literally the column
  titles. `normalizeService` detects and drops any row with 2+ self-titled
  cells before it reaches normalization, rather than letting it pollute
  aggregates as a fake record.

## Trade-offs
- **Pre-computed stats over raw-data LLM reasoning.** `biService.js`
  computes revenue, win rate, sector breakdowns, overdue work orders, and
  outstanding receivables in plain JS, then hands the LLM only the
  aggregates. Trade-off: the LLM can't answer truly novel ad-hoc slices
  outside what `biService` computes, but it eliminates hallucinated
  numbers, which matters more for a founder who will act on these figures.
- **Deterministic cross-board join over fuzzy matching.** `joinService.js`
  links a deal to its resulting work order(s) by normalizing Deals'
  `Client Code` (e.g. `COMPANY089`) and Work Orders' `Customer Name Code`
  (e.g. `WOCOMPANY_002`) to a shared key (strip the `WO` prefix and
  non-alphanumeric characters, uppercase). This was verified against the
  real data to match exactly for 50 of 51 client codes present on both
  boards — a masked "Deal Name" field (anime-character labels like "Sakura",
  reused across dozens of unrelated deals) was considered and rejected as a
  join key, since it isn't unique per deal. **Limitation**: if a future data
  refresh's exact-match rate degrades meaningfully below what was verified,
  a fuzzy/token-overlap fallback would be the next step — not implemented
  now because it isn't needed against the real dataset.
- **Timeframe filtering with an exclude-and-caveat policy.** A record with
  no parseable date in the relevant field (close date for deals, probable
  end date for work orders) is excluded from a time-scoped aggregate rather
  than silently included — but the exclusion count is surfaced as a caveat,
  the same pattern already used for missing-field caveats. Silently
  including it would misrepresent confidence in a number the agent is told
  to "lead with"; silently dropping with no caveat would hide a real
  data-quality issue. Given that the real "Close Date (A)" field is filled
  only ~8% of the time, most quarter/month-scoped deal questions will
  legitimately fall back to "Tentative Close Date" and this caveat will
  appear often — that's expected, not a bug.
- **Bare "year"/"ytd" collapse to the same Jan-1-through-today range**,
  since a full future-dated Jan–Dec range is never useful for a "how are we
  doing" question. An explicit quarter with no year defaults to the current
  year, surfaced via a human-readable range label in the LLM prompt (e.g.
  "Q4 2024 (2024-10-01 to 2024-11-15)") so the assumption is visible rather
  than silent.
- **Keyword-based clarification instead of a full agentic planner.** The
  agent only asks a clarifying question when a query invokes "sector"
  generically without naming one and multiple sectors exist in the data.
  Over-triggering clarification for ambiguous timeframe/metric phrasing was
  deliberately not added — a well-labeled assumption (see above) is a
  better user experience than an extra round-trip for every underspecified
  question.
- **In-memory TTL cache instead of a database.** `utils/cache.js` caches
  monday.com reads for 5 minutes to avoid rate limits and speed up repeat
  queries. Trade-off: cache is per-process and resets on redeploy — fine
  for a single-instance BI agent, not for horizontal scaling.
- **Multi-turn context via client-supplied history**, not a server-side
  session store. Simpler to deploy statelessly on Render, at the cost of
  losing history on page refresh.
- **A curated, not exhaustive, set of real columns is surfaced.** The real
  Work Orders source has 38 columns (8 separate monetary variants, several
  overlapping status fields). Rather than mirroring every raw column, the
  board and the BI logic target the subset that's actually decision-relevant
  (execution status, probable end date, one canonical value field, one
  receivables field, billing status) — consistent with the assignment's
  "set up appropriate column types and structure as you see fit."

## What I'd do differently with more time
- Add a fuzzy-match fallback to `joinService.js` for the rare unmatched
  client code, with a confidence label distinct from the exact-match case.
- Build a proper eval set of founder-style questions with expected answer
  shapes, to regression-test the agent's numeric accuracy over time as the
  live board data changes.
- Move caching to Redis if this needs to run on more than one instance.
- Surface the 7 additional real monetary/status columns on the Work Orders
  board (GST variants, invoice/billing sub-statuses) that were deliberately
  left out of the curated BI logic, for founders who want to drill into
  billing reconciliation specifically rather than execution/pipeline health.

## How "leadership updates" was interpreted
Implemented as `GET /api/agent/leadership-summary`: it computes the same BI
aggregates and cross-board join summary used for chat, then asks the LLM to
produce a 5-7 bullet founder-ready update covering pipeline health, sector
performance, operational status, and — using the join data — how many Won
deals have no matched work order yet (a genuine leadership-relevant signal:
revenue that's closed but not yet started in execution), with a final bullet
flagging data quality caveats. This turns "prepare data for leadership
updates" into an on-demand, always-current summary rather than a static
export, surfaced in the frontend via a "Generate Leadership Update" panel,
so it can be pulled into a board update at any time without manual assembly.
