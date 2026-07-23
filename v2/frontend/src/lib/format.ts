// Indian numbering (Lakh = 1e5, Crore = 1e7) — the audience is an Indian
// company's leadership, so values read as "₹230.55 Cr", not "₹2.31B".

const LAKH = 100000;
const CRORE = 10000000;

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= CRORE) return `${sign}₹${trim(abs / CRORE, 2)} Cr`;
  if (abs >= LAKH) return `${sign}₹${trim(abs / LAKH, 1)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
}

// Full-precision Indian-grouped rupees, for on-demand tooltips only.
export function formatCurrencyPrecise(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value}%`;
}

// Drops a trailing ".0"/".00" so whole numbers read cleanly (₹5 Cr, not ₹5.00 Cr).
function trim(n: number, decimals: number): string {
  return Number(n.toFixed(decimals)).toLocaleString("en-IN");
}
