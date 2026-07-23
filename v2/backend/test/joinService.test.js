const assert = require('assert');
const { normalizeClientCode, joinDealsToWorkOrders, computeJoinSummary } = require('../services/joinService');

// Prefix-stripping correctness -- verified against the real source data,
// Deals' "COMPANY089" and Work Orders' "WOCOMPANY_002" style codes match
// exactly once normalized this way.
assert.strictEqual(normalizeClientCode('WOCOMPANY_002'), 'COMPANY002');
assert.strictEqual(normalizeClientCode('COMPANY002'), 'COMPANY002');
assert.strictEqual(normalizeClientCode('wo-company_089'), 'COMPANY089');
assert.strictEqual(normalizeClientCode(''), null);
assert.strictEqual(normalizeClientCode(null), null);

const workOrders = [
  { type: 'work_order', name: 'Sakura WO', fields: { 'Customer Name Code': 'WOCOMPANY_002' } },
  { type: 'work_order', name: 'Naruto WO', fields: { 'Customer Name Code': 'WOCOMPANY_050' } },
];

const deals = [
  { type: 'deal', name: 'Sakura', fields: { 'Client Code': 'COMPANY002', 'Deal Status': 'Won' } },
  { type: 'deal', name: 'Sasuke', fields: { 'Client Code': 'COMPANY999', 'Deal Status': 'Won' } }, // no matching WO
  { type: 'deal', name: 'NoCode', fields: { 'Deal Status': 'Open' } }, // no client code at all
];

const matches = joinDealsToWorkOrders(deals, workOrders);
assert.strictEqual(matches[0].confidence, 'exact');
assert.deepStrictEqual(matches[0].matchedWorkOrders, ['Sakura WO']);
assert.strictEqual(matches[1].confidence, 'none');
assert.strictEqual(matches[2].confidence, 'none'); // degrades gracefully, never throws on a missing code

const summary = computeJoinSummary(deals, workOrders);
assert.strictEqual(summary.totalDeals, 3);
assert.strictEqual(summary.dealsWithLinkedWork, 1);
assert.strictEqual(summary.dealsUnmatched, 2);
assert.strictEqual(summary.linkRate, 33.3);
// "Sasuke" is Won with no matched work order -- a real leadership signal.
assert.strictEqual(summary.wonDealsMissingExecution, 1);

console.log('joinService tests passed');
