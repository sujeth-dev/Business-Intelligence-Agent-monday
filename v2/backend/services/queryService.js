// Lightweight intent classification -- decides whether a founder's query
// is scoped enough to answer, or whether the agent should ask a clarifying
// question first (per the "Query Understanding" requirement).

// Real Skylark Drones sector/service values (see normalizeService's
// SECTOR_ALIASES for the canonical casing) -- not the generic business
// sectors assumed before the real board data was inspected.
const SECTOR_KEYWORDS = [
  'renewables', 'mining', 'railways', 'powerline', 'construction',
  'dsp', 'tender', 'manufacturing', 'security and surveillance', 'aviation', 'others',
];
const TIME_KEYWORDS = ['quarter', 'month', 'year', 'week', 'today', 'ytd', 'q1', 'q2', 'q3', 'q4'];
const METRIC_KEYWORDS = {
  revenue: ['revenue', 'value', 'pipeline value'],
  pipeline: ['pipeline', 'deals', 'funnel'],
  operations: ['work order', 'operations', 'execution', 'overdue', 'status'],
  sector: ['sector', 'industry', 'vertical'],
};

function detectSector(message) {
  const lower = message.toLowerCase();
  return SECTOR_KEYWORDS.find((s) => lower.includes(s)) || null;
}

function detectTimeframe(message) {
  const lower = message.toLowerCase();
  return TIME_KEYWORDS.find((t) => lower.includes(t)) || null;
}

// An explicit year alongside a bare quarter ("Q4 2024") disambiguates which
// year's quarter is meant; without one, timeframeService defaults to the
// current year (see docs/DECISION_LOG.md).
function detectTimeframeYear(message) {
  const match = message.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function detectMetricFocus(message) {
  const lower = message.toLowerCase();
  const matches = Object.entries(METRIC_KEYWORDS)
    .filter(([, kws]) => kws.some((k) => lower.includes(k)))
    .map(([metric]) => metric);
  return matches.length ? matches : ['general'];
}

// Only ask for clarification when the query explicitly invokes the concept
// of "sector" without naming one, AND the data actually has more than one
// sector to choose between -- otherwise clarifying is just friction.
function classifyQuery(message, { availableSectors = [] } = {}) {
  const sector = detectSector(message);
  const timeframe = detectTimeframe(message);
  const timeframeYear = detectTimeframeYear(message);
  const metrics = detectMetricFocus(message);

  const mentionsSectorConcept = /sector|industry|vertical/i.test(message) && !sector;
  const needsSectorClarification = mentionsSectorConcept && availableSectors.length > 1;

  return {
    sector,
    timeframe,
    timeframeYear,
    metrics,
    needsClarification: needsSectorClarification,
    clarifyingQuestion: needsSectorClarification
      ? `Which sector should I focus on? Available sectors in the data: ${availableSectors.join(', ')}.`
      : null,
  };
}

module.exports = { classifyQuery, detectSector, detectTimeframe, detectTimeframeYear, detectMetricFocus };
