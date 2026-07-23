// Links a Deal to the Work Order(s) it converted into. Deals' "Client Code"
// (e.g. "COMPANY089") and Work Orders' "Customer Name Code" (e.g.
// "WOCOMPANY_002") were verified against the real source data to match
// exactly once the "WO" prefix and punctuation are stripped -- a reliable
// deterministic join, no fuzzy name matching needed (the masked "Deal Name"
// values like "Sakura"/"Naruto" are reused across dozens of unrelated deals
// and are not usable as an identifier).

const CLIENT_CODE_FIELDS = ['Client Code', 'Customer Name Code'];

function normalizeClientCode(raw) {
  if (!raw) return null;
  const stripped = String(raw).trim().toUpperCase().replace(/^WO[-_ ]?/, '');
  const alnum = stripped.replace(/[^A-Z0-9]/g, '');
  return alnum || null;
}

function extractClientCode(record) {
  for (const title of CLIENT_CODE_FIELDS) {
    if (record.fields[title]) return normalizeClientCode(record.fields[title]);
  }
  return null;
}

function joinDealsToWorkOrders(deals, workOrders) {
  const workOrdersByCode = new Map();
  workOrders.forEach((wo) => {
    const code = extractClientCode(wo);
    if (!code) return;
    if (!workOrdersByCode.has(code)) workOrdersByCode.set(code, []);
    workOrdersByCode.get(code).push(wo);
  });

  return deals.map((deal) => {
    const code = extractClientCode(deal);
    const matches = code ? (workOrdersByCode.get(code) || []) : [];
    return {
      dealName: deal.name,
      clientCode: code,
      confidence: matches.length > 0 ? 'exact' : 'none',
      matchedWorkOrders: matches.map((wo) => wo.name),
    };
  });
}

function computeJoinSummary(deals, workOrders) {
  const details = joinDealsToWorkOrders(deals, workOrders);
  const dealsWithLinkedWork = details.filter((d) => d.confidence === 'exact').length;
  const dealsUnmatched = details.length - dealsWithLinkedWork;

  const wonDealsMissingExecution = deals.filter((deal, idx) => {
    const status = String(deal.fields['Deal Status'] || '').toLowerCase();
    return /won/.test(status) && details[idx].confidence === 'none';
  }).length;

  return {
    totalDeals: deals.length,
    dealsWithLinkedWork,
    dealsUnmatched,
    linkRate: deals.length > 0 ? Number(((dealsWithLinkedWork / deals.length) * 100).toFixed(1)) : null,
    wonDealsMissingExecution,
    details,
  };
}

module.exports = { normalizeClientCode, extractClientCode, joinDealsToWorkOrders, computeJoinSummary };
