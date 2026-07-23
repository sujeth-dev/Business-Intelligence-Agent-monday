const { fetchWorkOrders, fetchDeals } = require('../services/mondayService');
const { normalizeRecords } = require('../services/normalizeService');
const { computeBiSummary } = require('../services/biService');
const { computeJoinSummary } = require('../services/joinService');

function fail(error, label) {
  error.status = error.status || 502;
  error.publicMessage = error.publicMessage || `Failed to fetch ${label} from monday.com`;
  return error;
}

exports.getWorkOrders = async (req, res, next) => {
  try {
    const raw = await fetchWorkOrders();
    res.json(normalizeRecords(raw, 'work_order'));
  } catch (error) {
    next(fail(error, 'work orders'));
  }
};

exports.getDeals = async (req, res, next) => {
  try {
    const raw = await fetchDeals();
    res.json(normalizeRecords(raw, 'deal'));
  } catch (error) {
    next(fail(error, 'deals'));
  }
};

exports.getBiSummary = async (req, res, next) => {
  try {
    const [rawWorkOrders, rawDeals] = await Promise.all([fetchWorkOrders(), fetchDeals()]);
    const workOrders = normalizeRecords(rawWorkOrders, 'work_order');
    const deals = normalizeRecords(rawDeals, 'deal');
    const bi = computeBiSummary(workOrders, deals);
    const joins = computeJoinSummary(deals, workOrders);
    res.json({ ...bi, joins });
  } catch (error) {
    next(fail(error, 'BI summary'));
  }
};
