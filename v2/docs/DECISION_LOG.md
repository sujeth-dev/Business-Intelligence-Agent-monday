# Decision Log

## Key assumptions

- Board IDs and the API token come from env vars only. Nothing from the CSVs
  is hardcoded anywhere — the agent always queries monday.com live, per the
  requirement.
- Work Orders and Deals are the only data sources. No CRM/accounting
  integrations in this pass.
- When looking up columns, I match the exact real column title first
  (`Deal Status`, `Client Code`, `Probable End Date`, etc. — checked against
  the actual source files and the live board schema) and only fall back to
  substring hints if that fails. The reason: several real columns share
  words. `Deal Status` vs `Deal Stage`, and the Work Orders board has five
  different "...Date" columns, so hint-matching alone would just grab
  whichever one happens to match first. Exact-first with a hint fallback
  keeps it accurate but still survives minor schema drift.
- Before opening the real files I assumed sectors would be generic business
  categories (Energy, Agriculture, etc.). They're not — the real taxonomy is
  Renewables, Mining, Railways, Powerline, Construction, DSP, Tender,
  Manufacturing, Security and Surveillance, Aviation, Others. The code uses
  the real list; the early assumption is gone.
- Some dates in the source trackers are raw Excel serial numbers (e.g.
  `46079`) instead of formatted text, wherever a column wasn't imported as a
  proper Date type. `parseDate` decodes these, but only within a plausible
  ~1954–2064 window so an ordinary numeric field like a quantity can't get
  misread as a date.
- Two rows in the real Deals file are a header row someone re-pasted
  mid-sheet (the cell values are literally the column titles). The
  normalizer detects rows where 2+ cells equal their own column title and
  drops them before they can pollute any aggregate.

## Trade-offs

**Pre-computed stats instead of letting the LLM reason over raw rows.**
Revenue, win rate, sector breakdowns, overdue WOs and receivables are all
computed in plain JS; the LLM only gets the finished aggregates. The cost is
that it can't answer a truly novel slice I didn't anticipate. The win is
that it can't hallucinate a number, which I think matters more when a
founder might actually act on the answer.

**Deterministic join instead of fuzzy matching.** Deals carry a
`Client Code` like `COMPANY089`; Work Orders carry `Customer Name Code` like
`WOCOMPANY_002`. Strip the `WO` prefix and non-alphanumerics, uppercase, and
you get a shared key. I checked this against the real data: 50 of 51 client
codes that appear on both boards match exactly. I also looked at joining on
"Deal Name", but those are masked anime-character labels ("Sakura" etc.)
reused across dozens of unrelated deals, so that was a dead end. If a future
data refresh matches much worse than ~98%, a fuzzy fallback would be the
next step — I didn't build one now because the real data doesn't need it.

**Time filters exclude undateable records, but say so.** If a record has no
parseable date in the relevant field (close date for deals, probable end
date for WOs), a time-scoped aggregate leaves it out and reports the
exclusion count as a caveat. Including it silently would overstate
confidence; dropping it silently would hide a real data-quality problem.
Note the real "Close Date (A)" field is only ~8% filled, so quarter-scoped
deal questions usually fall back to "Tentative Close Date" and this caveat
shows up a lot — that's expected behaviour, not a bug.

**Bare "year" / "ytd" both mean Jan 1 through today** — a full Jan–Dec
range including the future is never what a "how are we doing" question
means. A quarter with no year defaults to the current year. Either way the
resolved range is spelled out in the prompt (e.g. "Q4 2024 (2024-10-01 to
2024-11-15)") so the assumption is visible to the user, not silent.

**Keyword-based clarification, not a full agentic planner.** The agent asks
a clarifying question in exactly one case: the query says "sector"
generically, doesn't name one, and the data has several. I deliberately
didn't extend this to vague timeframes or metrics — a clearly-labeled
assumption reads better than an extra round-trip on every underspecified
question.

**In-memory TTL cache, no database.** Monday.com reads are cached for 5
minutes to dodge rate limits and speed up repeat queries. It's per-process
and resets on redeploy, which is fine for a single-instance agent and not
fine for horizontal scaling.

**Multi-turn context is client-supplied history**, not a server-side
session store. Keeps the backend stateless on Railway; the cost is that
history dies on page refresh.

**Curated columns, not all 38.** The real Work Orders sheet has 38 columns,
including 8 monetary variants and several overlapping status fields. The
board and the BI logic use the subset that's actually decision-relevant
(execution status, probable end date, one canonical value field, one
receivables field, billing status). The assignment says to set up structure
as I see fit, and this is how I see fit.

## What I'd do differently with more time

- Fuzzy-match fallback in the join for the rare unmatched client code, with
  its own confidence label so it's distinguishable from an exact match.
- An eval set of founder-style questions with expected answer shapes, to
  regression-test numeric accuracy as the live boards change.
- Redis for the cache if this ever runs on more than one instance.
- Surface the 7 billing-related columns (GST variants, invoice
  sub-statuses) I left out of the curated set, for anyone drilling into
  billing reconciliation rather than execution/pipeline health.

## How I interpreted "leadership updates"

As an on-demand summary rather than a static export:
`GET /api/agent/leadership-summary` reuses the same aggregates and join data
as chat and asks the LLM for a 5–7 bullet founder-ready update — pipeline
health, sector performance, operational status, and one signal that only
exists because of the cross-board join: how many Won deals have no matched
work order yet, i.e. revenue that's closed but hasn't started execution.
The last bullet always flags data-quality caveats. It's exposed in the
frontend as a "Generate Leadership Update" button, so it can be pulled fresh
into a board update at any time instead of assembling one by hand.
