const assert = require('assert');
const { computeBiSummary, findExactOrHint } = require('../services/biService');

const workOrders = [
  {
    type: 'work_order',
    name: 'WO1',
    fields: { 'Execution Status': 'Completed', 'Probable End Date': '2020-01-01', 'Amount Receivable (Masked)': 0 },
    hasMissingFields: false,
  },
  {
    type: 'work_order',
    name: 'WO2',
    fields: { 'Execution Status': 'Ongoing', 'Probable End Date': '2099-01-01', 'Amount Receivable (Masked)': 5000 },
    hasMissingFields: false,
  },
  {
    // Past-due but recurring-and-currently-serviced -- must NOT count as overdue.
    type: 'work_order',
    name: 'WO3',
    fields: { 'Execution Status': 'Executed until current month', 'Probable End Date': '2020-01-01' },
    hasMissingFields: true,
  },
  {
    // Genuinely overdue: past end date, not in a "not overdue eligible" status.
    type: 'work_order',
    name: 'WO4',
    fields: { 'Execution Status': 'Not Started', 'Probable End Date': '2020-01-01', 'WO Status (billed)': 'Open' },
    hasMissingFields: false,
  },
];

const deals = [
  { type: 'deal', name: 'D1', fields: { 'Masked Deal value': 1000, 'Sector/service': 'Renewables', 'Deal Status': 'Won' }, hasMissingFields: false },
  { type: 'deal', name: 'D2', fields: { 'Masked Deal value': 500, 'Sector/service': 'Renewables', 'Deal Status': 'Dead' }, hasMissingFields: false },
  { type: 'deal', name: 'D3', fields: { 'Masked Deal value': null, 'Sector/service': 'Mining', 'Deal Status': 'Open' }, hasMissingFields: true },
];

const summary = computeBiSummary(workOrders, deals);

assert.strictEqual(summary.deals.totalDeals, 3);
assert.strictEqual(summary.deals.totalPipelineValue, 1500);
assert.strictEqual(summary.deals.won, 1);
assert.strictEqual(summary.deals.lost, 1); // "Dead" must be classified as lost, not left in "open"
assert.strictEqual(summary.deals.open, 1);
assert.strictEqual(summary.deals.winRate, 50);
assert.strictEqual(summary.deals.bySector.Renewables.count, 2);

assert.strictEqual(summary.workOrders.totalWorkOrders, 4);
assert.strictEqual(summary.workOrders.statusCounts.Completed, 1);
assert.strictEqual(summary.workOrders.statusCounts['Executed until current month'], 1);
assert.strictEqual(summary.workOrders.overdueCount, 1); // only WO4
assert.strictEqual(summary.workOrders.billingStatusCounts.Open, 1);
assert.strictEqual(summary.workOrders.totalOutstandingReceivable, 5000);
assert.strictEqual(summary.workOrders.workOrdersMissingReceivable, 2); // WO3 and WO4 have none

assert.strictEqual(summary.dataQuality.dealsWithMissingFields, 1);
assert.strictEqual(summary.dataQuality.workOrdersWithMissingFields, 1);

// findExactOrHint: exact title wins even when a hint would ambiguously match
// a *different* real column (Deal Status vs Deal Stage).
const ambiguousFields = { 'Deal Stage': 'E. Proposal/Commercials Sent', 'Deal Status': 'Won' };
assert.strictEqual(findExactOrHint(ambiguousFields, 'Deal Status', ['status']), 'Won');
// Falls back to hint matching when the exact title isn't present.
assert.strictEqual(findExactOrHint({ status: 'Open' }, 'Deal Status', ['status']), 'Open');
// Returns null (never throws) when neither the exact title nor any hint matches.
assert.strictEqual(findExactOrHint({}, 'Deal Status', ['status']), null);

console.log('biService tests passed');
