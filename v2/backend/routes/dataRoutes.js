const express = require('express');
const router = express.Router();
const { getWorkOrders, getDeals, getBiSummary } = require('../controllers/dataController');

router.get('/workorders', getWorkOrders);
router.get('/deals', getDeals);
router.get('/bi-summary', getBiSummary);

module.exports = router;
