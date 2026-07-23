const express = require('express');
const router = express.Router();
const { handleAgentChat, getLeadershipSummary } = require('../controllers/agentController');

router.post('/chat', handleAgentChat);
router.get('/leadership-summary', getLeadershipSummary);

module.exports = router;
