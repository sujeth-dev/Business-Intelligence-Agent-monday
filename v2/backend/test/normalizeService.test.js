const assert = require('assert');
const { parseDate, normalizeSector, parseNumber, cleanText, normalizeRecords, isStrayHeaderRow } = require('../services/normalizeService');

// Date normalization across formats
assert.strictEqual(parseDate('2024-01-31'), '2024-01-31');
assert.strictEqual(parseDate('01/31/2024'), '2024-01-31');
assert.strictEqual(parseDate('31 Jan 2024'), '2024-01-31');
assert.strictEqual(parseDate(''), null);
assert.strictEqual(parseDate(null), null);

// Excel serial-date fallback (real source trackers store dates this way
// when a column isn't imported as a proper Date type -- e.g. 46079 = 2026-02-26)
assert.strictEqual(parseDate('46079'), '2026-02-26');
assert.strictEqual(parseDate('45534'), '2024-08-30');
assert.strictEqual(parseDate('12'), null); // too small to be a plausible date serial

// Real monday.com boards actually return this format for date columns (a
// serialized JS Date.toString()) -- verified against the live board.
assert.strictEqual(parseDate('Thu Feb 26 2026 00:00:00 GMT+0000 (Coordinated Universal Time)'), '2026-02-26');
assert.strictEqual(parseDate('Sat Sep 27 2025 00:00:00 GMT+0000 (Coordinated Universal Time)'), '2025-09-27');

// Sector alias normalization -- real Skylark Drones sector values
assert.strictEqual(normalizeSector('renewables'), 'Renewables');
assert.strictEqual(normalizeSector('MINING'), 'Mining');
assert.strictEqual(normalizeSector('mining'), 'Mining');
assert.strictEqual(normalizeSector('dsp'), 'DSP');
assert.strictEqual(normalizeSector('Security and Surveillance'), 'Security and Surveillance');
assert.strictEqual(normalizeSector('Some New Vertical'), 'Some New Vertical'); // unrecognized -> passed through, not dropped

// Number parsing from currency-formatted strings
assert.strictEqual(parseNumber('$1,200.50'), 1200.5);
assert.strictEqual(parseNumber('N/A'), null);

// Null/placeholder handling
assert.strictEqual(cleanText('  N/A '), null);
assert.strictEqual(cleanText('-'), null);
assert.strictEqual(cleanText(' Hello   World '), 'Hello World');

// End-to-end record normalization with real-shaped monday.com raw input
const raw = [
  {
    name: '  Sakura  ',
    column_values: [
      { id: 'text1', text: 'COMPANY089', column: { title: 'Client Code' } },
      { id: 'status1', text: 'Won', column: { title: 'Deal Status' } },
      { id: 'text2', text: 'Renewables', column: { title: 'Sector/service' } },
      { id: 'numeric1', text: '$489,360', column: { title: 'Masked Deal value' } },
      { id: 'date1', text: '46079', column: { title: 'Tentative Close Date' } },
      { id: 'text3', text: 'N/A', column: { title: 'Product deal' } },
    ],
  },
];
const normalized = normalizeRecords(raw, 'deal');
assert.strictEqual(normalized[0].name, 'Sakura');
assert.strictEqual(normalized[0].fields['Client Code'], 'COMPANY089');
assert.strictEqual(normalized[0].fields['Deal Status'], 'Won');
assert.strictEqual(normalized[0].fields['Sector/service'], 'Renewables');
assert.strictEqual(normalized[0].fields['Masked Deal value'], 489360);
assert.strictEqual(normalized[0].fields['Tentative Close Date'], '2026-02-26');
assert.strictEqual(normalized[0].fields['Product deal'], null);
assert.strictEqual(normalized[0].hasMissingFields, true);
assert.strictEqual(normalized[0].missingFieldCount, 1);

// Stray header-row artifact: a re-pasted header row (2+ cells whose value
// literally equals their own column title) must be dropped entirely, not
// normalized as a real record.
const strayHeaderItem = {
  name: 'Bugs Bunny',
  column_values: [
    { id: 'status1', text: 'Deal Status', column: { title: 'Deal Status' } },
    { id: 'text2', text: 'Sector/service', column: { title: 'Sector/service' } },
    { id: 'text3', text: 'Product deal', column: { title: 'Product deal' } },
  ],
};
assert.strictEqual(isStrayHeaderRow(strayHeaderItem), true);
assert.strictEqual(isStrayHeaderRow(raw[0]), false);
const withJunkRow = normalizeRecords([raw[0], strayHeaderItem], 'deal');
assert.strictEqual(withJunkRow.length, 1);
assert.strictEqual(withJunkRow[0].name, 'Sakura');

// A single coincidental self-titled cell (e.g. a sector literally named
// "Status") should NOT be enough to drop a real row.
const oneMatchOnly = {
  name: 'Naruto',
  column_values: [
    { id: 'text2', text: 'Sector/service', column: { title: 'Sector/service' } },
    { id: 'status1', text: 'Won', column: { title: 'Deal Status' } },
  ],
};
assert.strictEqual(isStrayHeaderRow(oneMatchOnly), false);

console.log('normalizeService tests passed');
