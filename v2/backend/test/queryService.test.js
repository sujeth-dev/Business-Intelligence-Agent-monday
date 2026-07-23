const assert = require('assert');
const { classifyQuery, detectTimeframeYear } = require('../services/queryService');

// A query naming a sector explicitly should not trigger clarification
const r1 = classifyQuery('How is our mining sector pipeline this quarter?', { availableSectors: ['Mining', 'Renewables'] });
assert.strictEqual(r1.sector, 'mining');
assert.strictEqual(r1.needsClarification, false);

// A query invoking "sector" generically with multiple sectors available should clarify
const r2 = classifyQuery('How is our sector performance looking?', { availableSectors: ['Mining', 'Renewables'] });
assert.strictEqual(r2.needsClarification, true);
assert.ok(r2.clarifyingQuestion.includes('Mining'));

// If there's only one sector in the data, no need to ask
const r3 = classifyQuery('How is our sector performance looking?', { availableSectors: ['Mining'] });
assert.strictEqual(r3.needsClarification, false);

// Multi-metric founder question -- must detect every relevant metric
// without spuriously triggering clarification, since a naming sector
// explicitly should never be ambiguous.
const r4 = classifyQuery('What is our revenue and overdue work orders in mining this quarter?', { availableSectors: ['Mining', 'Renewables'] });
assert.strictEqual(r4.needsClarification, false);
assert.strictEqual(r4.sector, 'mining');
assert.strictEqual(r4.timeframe, 'quarter');
assert.ok(r4.metrics.includes('revenue'));
assert.ok(r4.metrics.includes('operations'));

// Explicit quarter + year in the same question
const r5 = classifyQuery('How did Q4 2023 pipeline look for renewables?', { availableSectors: ['Renewables', 'Mining'] });
assert.strictEqual(r5.timeframe, 'q4');
assert.strictEqual(r5.timeframeYear, 2023);
assert.strictEqual(r5.sector, 'renewables');
assert.strictEqual(r5.needsClarification, false);

// A founder question with no sector/timeframe keyword at all -- general
// pipeline-health question should never over-trigger clarification.
const r6 = classifyQuery('How is our pipeline looking overall?', { availableSectors: ['Renewables', 'Mining'] });
assert.strictEqual(r6.needsClarification, false);
assert.deepStrictEqual(r6.metrics, ['pipeline']);

assert.strictEqual(detectTimeframeYear('Q4 2023 numbers please'), 2023);
assert.strictEqual(detectTimeframeYear('this quarter'), null);

console.log('queryService tests passed');
