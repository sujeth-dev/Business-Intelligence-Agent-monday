const assert = require('assert');
const { resolveTimeframe, filterRecordsByRange } = require('../services/timeframeService');

// Fixed reference date unrelated to the real current date -- 2024-05-15 is a
// Wednesday, mid-Q2, mid-month. Every case below is computed relative to it,
// never to `new Date()`.
const REF = new Date('2024-05-15T00:00:00Z');

assert.strictEqual(resolveTimeframe(null, { referenceDate: REF }), null);
assert.strictEqual(resolveTimeframe('bogus', { referenceDate: REF }), null);

const today = resolveTimeframe('today', { referenceDate: REF });
assert.deepStrictEqual([today.start, today.end], ['2024-05-15', '2024-05-15']);

const week = resolveTimeframe('week', { referenceDate: REF });
// Monday of that week is 2024-05-13; Sunday (05-19) is in the future relative
// to the reference date, so the end must be capped at the reference date.
assert.strictEqual(week.start, '2024-05-13');
assert.strictEqual(week.end, '2024-05-15');

const month = resolveTimeframe('month', { referenceDate: REF });
assert.strictEqual(month.start, '2024-05-01');
assert.strictEqual(month.end, '2024-05-15'); // capped -- May isn't over yet

const quarter = resolveTimeframe('quarter', { referenceDate: REF });
assert.strictEqual(quarter.start, '2024-04-01');
assert.strictEqual(quarter.end, '2024-05-15'); // Q2 in progress, capped

const ytd = resolveTimeframe('ytd', { referenceDate: REF });
assert.strictEqual(ytd.start, '2024-01-01');
assert.strictEqual(ytd.end, '2024-05-15');
const year = resolveTimeframe('year', { referenceDate: REF });
assert.deepStrictEqual([year.start, year.end], [ytd.start, ytd.end]); // "year" collapses to YTD

// Explicit past quarter with an explicit year -- returned uncapped in full.
const pastQ1 = resolveTimeframe('q1', { year: 2023, referenceDate: REF });
assert.strictEqual(pastQ1.start, '2023-01-01');
assert.strictEqual(pastQ1.end, '2023-03-31');

// Explicit quarter later in the *current* year that hasn't happened yet --
// must not throw; yields an (honestly) empty range rather than guessing.
const futureQ4 = resolveTimeframe('q4', { referenceDate: REF });
assert.strictEqual(futureQ4.start, '2024-10-01');
assert.strictEqual(futureQ4.end, '2024-05-15'); // capped below start -> zero matches downstream, not an error

// filterRecordsByRange
const records = [
  { name: 'in-range', fields: { d: '2024-05-01' } },
  { name: 'out-of-range', fields: { d: '2024-01-01' } },
  { name: 'undated', fields: { d: null } },
  { name: 'missing-field', fields: {} },
];
const tiers = [['d']];

const noFilter = filterRecordsByRange(records, null, tiers);
assert.strictEqual(noFilter.matched.length, 4);
assert.strictEqual(noFilter.excludedUndated.length, 0);

const monthRange = resolveTimeframe('month', { referenceDate: REF });
const filtered = filterRecordsByRange(records, monthRange, tiers);
assert.deepStrictEqual(filtered.matched.map((r) => r.name), ['in-range']);
assert.deepStrictEqual(filtered.excludedUndated.map((r) => r.name), ['undated', 'missing-field']);

console.log('timeframeService tests passed');
