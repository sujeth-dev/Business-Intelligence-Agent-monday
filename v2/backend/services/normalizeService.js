// Handles the "messy real-world data" requirement: inconsistent date
// formats, sector/industry naming variants, blank/N-A placeholders, and
// currency-formatted numbers.

const DATE_PATTERNS = [
  { re: /^(\d{4})-(\d{2})-(\d{2})$/, order: ['y', 'm', 'd'] },        // 2024-01-31
  { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: ['m', 'd', 'y'] },  // 01/31/2024
  { re: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: ['d', 'm', 'y'] },    // 31-01-2024
  { re: /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/, order: ['d', 'mon', 'y'] }, // 31 Jan 2024
];

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// Excel epoch (1899-12-30) -- source trackers store dates as raw serial day
// counts (e.g. 46079) when a column wasn't imported as a proper Date type.
const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

function parseExcelSerialDate(s) {
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const serial = Number(s);
  // Bound to a plausible real-world range (~1954-2064) so we never misread an
  // ordinary numeric field (a quantity, an amount) as a date.
  if (serial < 20000 || serial > 60000) return null;
  const d = new Date(EXCEL_EPOCH_UTC_MS + Math.round(serial) * 86400000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// JS `Date.prototype.toString()` output (e.g. "Thu Feb 26 2026 00:00:00
// GMT+0000 (Coordinated Universal Time)") -- this is how the live
// monday.com boards actually return date-ish columns once a spreadsheet
// tool's Date object was serialized without an explicit ISO conversion.
// Gated behind a specific shape (weekday + month name + day + year) so an
// unrelated messy string is never misread as a date via native parsing.
const JS_DATE_STRING_RE = /^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}/;

function parseJsDateString(s) {
  if (!JS_DATE_STRING_RE.test(s)) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  for (const { re, order } of DATE_PATTERNS) {
    const match = s.match(re);
    if (!match) continue;
    const parts = {};
    order.forEach((key, idx) => { parts[key] = match[idx + 1]; });
    const year = Number(parts.y);
    const day = Number(parts.d);
    const month = parts.mon ? MONTHS[parts.mon.slice(0, 3).toLowerCase()] : Number(parts.m);
    if (!year || !month || !day || month > 12 || day > 31) continue;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return iso;
  }

  return parseJsDateString(s) || parseExcelSerialDate(s);
}

// Real sector/service values seen on the Skylark Drones boards (Deals +
// Work Orders) -- deliberately not the generic business-sector categories
// (Energy/Agriculture/Telecom/Government) assumed before the real data was
// inspected. Unrecognized values are still surfaced (title-cased), never
// dropped, since new sectors may appear over time.
const SECTOR_ALIASES = {
  renewables: 'Renewables', renewable: 'Renewables', solar: 'Renewables', wind: 'Renewables',
  mining: 'Mining', mines: 'Mining',
  railways: 'Railways', railway: 'Railways', rail: 'Railways',
  powerline: 'Powerline', 'power line': 'Powerline', power: 'Powerline',
  construction: 'Construction',
  dsp: 'DSP',
  tender: 'Tender',
  manufacturing: 'Manufacturing',
  'security and surveillance': 'Security and Surveillance', security: 'Security and Surveillance', surveillance: 'Security and Surveillance',
  aviation: 'Aviation',
  others: 'Others', other: 'Others',
};

function titleCase(s) {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function normalizeSector(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  return SECTOR_ALIASES[key] || titleCase(String(raw).trim());
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).replace(/\s+/g, ' ').trim();
  if (trimmed === '' || /^(n\/a|na|-|none|null|unknown)$/i.test(trimmed)) return null;
  return trimmed;
}

function parseNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

const DATE_ID_HINTS = ['date', 'deadline', 'due', 'created', 'closed'];
const NUMBER_ID_HINTS = ['value', 'amount', 'revenue', 'price', 'cost', 'budget'];
const SECTOR_ID_HINTS = ['sector', 'industry', 'vertical'];

// Real messy-data artifact seen in the source trackers: a header row
// re-pasted mid-sheet, so its cell values are literally the column titles
// (e.g. a row whose "Deal Status" cell contains the text "Deal Status").
// Two or more such self-titled cells is a strong signal the whole row is
// junk, not real data -- a single coincidental match (e.g. a sector
// literally named "Status") isn't enough to drop a row.
function isStrayHeaderRow(item) {
  const values = item.column_values || [];
  let selfTitledCount = 0;
  for (const col of values) {
    const title = col.column?.title;
    if (title && col.text != null && String(col.text).trim() === title.trim()) {
      selfTitledCount += 1;
      if (selfTitledCount >= 2) return true;
    }
  }
  return false;
}

function normalizeRecords(items, recordType) {
  return (items || []).filter((item) => !isStrayHeaderRow(item)).map((item) => {
    const fields = {};
    let missingCount = 0;
    let totalCount = 0;

    (item.column_values || []).forEach((col) => {
      // Prefer the human-set column title for hint matching -- monday.com
      // assigns internal column ids (e.g. "numeric_mm5hzjct") that rarely
      // contain the keyword hints, while titles ("Deal Value", "Sector")
      // reliably do.
      const key = col.column?.title || col.id;
      const hintSource = key.toLowerCase();
      totalCount += 1;
      const value = cleanText(col.text);

      if (value === null) {
        missingCount += 1;
        fields[key] = null;
        return;
      }

      if (DATE_ID_HINTS.some((h) => hintSource.includes(h))) {
        fields[key] = parseDate(value);
      } else if (NUMBER_ID_HINTS.some((h) => hintSource.includes(h))) {
        fields[key] = parseNumber(value);
      } else if (SECTOR_ID_HINTS.some((h) => hintSource.includes(h))) {
        fields[key] = normalizeSector(value);
      } else {
        fields[key] = value;
      }
    });

    return {
      type: recordType,
      name: cleanText(item.name),
      fields,
      missingFieldCount: missingCount,
      totalFieldCount: totalCount,
      hasMissingFields: missingCount > 0,
    };
  });
}

module.exports = { normalizeRecords, parseDate, normalizeSector, parseNumber, cleanText, isStrayHeaderRow };
