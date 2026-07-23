// Computes actual aggregate numbers from normalized records so the LLM
// narrates real stats instead of hallucinating them from raw JSON.

function findFieldValue(fields, hints) {
  const key = Object.keys(fields).find((k) => hints.some((h) => k.toLowerCase().includes(h)));
  return key ? fields[key] : null;
}

// Prefers an exact column title over substring-hint matching. Several real
// columns share overlapping hint words -- "Deal Status" vs "Deal Stage", or
// five different "...Date" columns on the Work Orders board -- so
// first-hint-wins is unsafe once more than one plausible column exists.
// Falls back to the hint list so this still degrades gracefully against a
// board whose columns were titled/imported slightly differently.
function findExactOrHint(fields, exactTitles, hints = []) {
  const titles = Array.isArray(exactTitles) ? exactTitles : [exactTitles];
  for (const title of titles) {
    if (fields[title] !== undefined && fields[title] !== null) return fields[title];
  }
  return findFieldValue(fields, hints);
}

function computeDealsSummary(deals) {
  const sectors = {};
  let totalValue = 0;
  let won = 0;
  let lost = 0;
  let open = 0;
  let missingValueCount = 0;

  deals.forEach((d) => {
    const value = findExactOrHint(d.fields, ['Masked Deal value', 'Deal Value'], ['value', 'amount', 'revenue', 'price']);
    const sector = findExactOrHint(d.fields, ['Sector/service', 'Sector'], ['sector', 'industry', 'vertical']) || 'Unspecified';
    // Deal Status (Won/Dead/Open/On Hold) is the real win/loss signal --
    // Deal Stage is a funnel-position field ("E. Proposal/Commercials
    // Sent") and must not be mistaken for it.
    const status = String(findExactOrHint(d.fields, 'Deal Status', ['status']) || '').toLowerCase();

    if (typeof value === 'number') totalValue += value;
    else missingValueCount += 1;

    sectors[sector] = sectors[sector] || { count: 0, value: 0 };
    sectors[sector].count += 1;
    sectors[sector].value += typeof value === 'number' ? value : 0;

    if (/won/.test(status)) won += 1;
    else if (/dead|lost/.test(status)) lost += 1;
    else open += 1;
  });

  const decided = won + lost;
  return {
    totalDeals: deals.length,
    totalPipelineValue: totalValue,
    dealsMissingValue: missingValueCount,
    won,
    lost,
    open,
    winRate: decided > 0 ? Number(((won / decided) * 100).toFixed(1)) : null,
    bySector: sectors,
  };
}

// Execution states that mean the work is currently handled and shouldn't
// count as overdue even if the probable end date has passed -- in
// particular "Executed until current month" describes a recurring
// contract that's actively being serviced, not a missed one-off deadline.
const NOT_OVERDUE_ELIGIBLE = /completed|executed until current month|partial completed/i;

function computeWorkOrdersSummary(workOrders) {
  const statusCounts = {};
  const billingStatusCounts = {};
  let overdue = 0;
  let totalOutstandingReceivable = 0;
  let workOrdersMissingReceivable = 0;
  const today = new Date().toISOString().slice(0, 10);

  workOrders.forEach((w) => {
    const status = findExactOrHint(w.fields, 'Execution Status', ['status']) || 'Unspecified';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Billing closure ("WO Status (billed)": Open/Closed) is a distinct
    // concept from execution progress and is tracked separately so it's
    // never conflated with the overdue calculation below.
    const billingStatus = findExactOrHint(w.fields, 'WO Status (billed)');
    if (billingStatus) billingStatusCounts[billingStatus] = (billingStatusCounts[billingStatus] || 0) + 1;

    const deadline = findExactOrHint(w.fields, ['Probable End Date'], ['deadline', 'due']);
    if (deadline && deadline < today && !NOT_OVERDUE_ELIGIBLE.test(status)) {
      overdue += 1;
    }

    const receivable = findExactOrHint(w.fields, 'Amount Receivable (Masked)');
    if (typeof receivable === 'number') totalOutstandingReceivable += receivable;
    else workOrdersMissingReceivable += 1;
  });

  return {
    totalWorkOrders: workOrders.length,
    statusCounts,
    billingStatusCounts,
    overdueCount: overdue,
    totalOutstandingReceivable,
    workOrdersMissingReceivable,
  };
}

function computeBiSummary(workOrders, deals) {
  return {
    deals: computeDealsSummary(deals),
    workOrders: computeWorkOrdersSummary(workOrders),
    dataQuality: {
      dealsWithMissingFields: deals.filter((d) => d.hasMissingFields).length,
      workOrdersWithMissingFields: workOrders.filter((w) => w.hasMissingFields).length,
    },
  };
}

module.exports = {
  computeBiSummary,
  computeDealsSummary,
  computeWorkOrdersSummary,
  findFieldValue,
  findExactOrHint,
};
