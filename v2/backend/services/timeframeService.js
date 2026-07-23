// Resolves a keyword timeframe (from queryService.detectTimeframe) into an
// actual UTC date range, and filters normalized records against it. All date
// math is UTC-based to match the convention already used elsewhere
// (normalizeService.parseDate / biService's overdue check both compare
// against `new Date().toISOString().slice(0,10)`), avoiding local-timezone
// off-by-one bugs near month/quarter boundaries.

function pad(n) { return String(n).padStart(2, '0'); }
function toIso(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

function startOfWeekMonday(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  return date;
}

function addDaysIso(y, m, d, days) {
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function lastDayOfMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function quarterBounds(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    start: toIso(year, startMonth, 1),
    end: toIso(year, endMonth, lastDayOfMonth(year, endMonth)),
  };
}

function capEnd(end, referenceIso) {
  return end > referenceIso ? referenceIso : end;
}

const QUARTER_KEYWORDS = { q1: 1, q2: 2, q3: 3, q4: 4 };

// resolveTimeframe(timeframe, { year, referenceDate }) -> { start, end, label } | null
// `referenceDate` should always be passed explicitly by the caller so this
// stays pure/deterministic for tests -- it's never read from the real clock
// internally beyond a last-resort default.
function resolveTimeframe(timeframe, { year, referenceDate } = {}) {
  if (!timeframe) return null;
  const ref = referenceDate || new Date();
  const refY = ref.getUTCFullYear();
  const refM = ref.getUTCMonth() + 1;
  const refD = ref.getUTCDate();
  const refIso = toIso(refY, refM, refD);

  if (timeframe === 'today') {
    return { start: refIso, end: refIso, label: `Today (${refIso})` };
  }

  if (timeframe === 'week') {
    const monday = startOfWeekMonday(refY, refM, refD);
    const startIso = toIso(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
    const endIso = addDaysIso(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), 6);
    return { start: startIso, end: capEnd(endIso, refIso), label: `This Week (${startIso} to ${endIso})` };
  }

  if (timeframe === 'month') {
    const startIso = toIso(refY, refM, 1);
    const endIso = toIso(refY, refM, lastDayOfMonth(refY, refM));
    return { start: startIso, end: capEnd(endIso, refIso), label: `This Month (${startIso} to ${endIso})` };
  }

  if (timeframe === 'quarter') {
    const q = Math.floor((refM - 1) / 3) + 1;
    const { start, end } = quarterBounds(refY, q);
    return { start, end: capEnd(end, refIso), label: `This Quarter (Q${q} ${refY}: ${start} to ${end})` };
  }

  // Bare "year"/"ytd" are treated identically -- Jan 1 through today, since a
  // full future-dated Jan-Dec range is never useful for a "how are we doing"
  // question. Documented assumption, see docs/DECISION_LOG.md.
  if (timeframe === 'year' || timeframe === 'ytd') {
    const startIso = toIso(refY, 1, 1);
    return { start: startIso, end: refIso, label: `Year to Date ${refY} (${startIso} to ${refIso})` };
  }

  if (QUARTER_KEYWORDS[timeframe]) {
    const q = QUARTER_KEYWORDS[timeframe];
    const y = year || refY;
    const { start, end } = quarterBounds(y, q);
    // Only cap a same-year quarter that's still in progress; a past or
    // explicitly future year is returned as its full range -- if the whole
    // range is in the future this just yields zero matches downstream,
    // which is an honest answer, not an error.
    const cappedEnd = y === refY ? capEnd(end, refIso) : end;
    return { start, end: cappedEnd, label: `Q${q} ${y} (${start} to ${cappedEnd})` };
  }

  return null;
}

function findByTiers(fields, tiers) {
  for (const tier of tiers) {
    for (const title of tier) {
      if (fields[title] !== undefined && fields[title] !== null) return fields[title];
    }
  }
  return null;
}

// filterRecordsByRange(records, range, hintTiers) -> { matched, excludedUndated }
// `range: null` passes every record through unfiltered. A record with no
// parseable date in any tier is excluded (never silently included in a
// time-scoped aggregate) but reported separately so the caller can surface
// it as a data-quality caveat rather than hiding it.
function filterRecordsByRange(records, range, hintTiers) {
  if (!range) return { matched: records, excludedUndated: [] };
  const matched = [];
  const excludedUndated = [];
  records.forEach((record) => {
    const dateValue = findByTiers(record.fields, hintTiers);
    if (!dateValue) {
      excludedUndated.push(record);
      return;
    }
    if (dateValue >= range.start && dateValue <= range.end) {
      matched.push(record);
    }
  });
  return { matched, excludedUndated };
}

// Tiered, exact-title date-field priority per record type, based on the real
// board schema: a deal's relevant date is its close date, falling back to
// tentative close / created date since "Close Date (A)" is only filled ~8%
// of the time; a work order's relevant date is its probable end date.
const DEAL_DATE_TIERS = [['Close Date (A)', 'Close Date'], ['Tentative Close Date'], ['Created Date']];
const WORK_ORDER_DATE_TIERS = [['Probable End Date'], ['Probable Start Date'], ['Date of PO/LOI']];

module.exports = {
  resolveTimeframe,
  filterRecordsByRange,
  DEAL_DATE_TIERS,
  WORK_ORDER_DATE_TIERS,
};
