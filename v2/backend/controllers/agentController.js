const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const { fetchWorkOrders, fetchDeals } = require('../services/mondayService');
const { normalizeRecords } = require('../services/normalizeService');
const { computeBiSummary } = require('../services/biService');
const { classifyQuery } = require('../services/queryService');
const { resolveTimeframe, filterRecordsByRange, DEAL_DATE_TIERS, WORK_ORDER_DATE_TIERS } = require('../services/timeframeService');
const { computeJoinSummary } = require('../services/joinService');

const LLM_PROVIDERS = {
  openai: {
    apiKeyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
  },
  groq: {
    apiKeyEnv: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
  },
};

function resolveLlmProvider() {
  const requested = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (requested) {
    if (!LLM_PROVIDERS[requested]) {
      const err = new Error(`Unknown LLM_PROVIDER "${requested}"`);
      err.status = 500;
      err.publicMessage = `LLM_PROVIDER must be one of: ${Object.keys(LLM_PROVIDERS).join(', ')}.`;
      throw err;
    }
    return requested;
  }
  return Object.keys(LLM_PROVIDERS).find((name) => process.env[LLM_PROVIDERS[name].apiKeyEnv]) || 'openai';
}

function getLlm() {
  const providerName = resolveLlmProvider();
  const provider = LLM_PROVIDERS[providerName];
  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) {
    const err = new Error(`${provider.apiKeyEnv} not configured`);
    err.status = 500;
    err.publicMessage = `The BI agent is not fully configured yet (missing ${provider.apiKeyEnv} for LLM_PROVIDER=${providerName}).`;
    throw err;
  }
  return new ChatOpenAI({
    modelName: process.env.LLM_MODEL || provider.defaultModel,
    temperature: 0.2,
    openAIApiKey: apiKey,
    configuration: provider.baseURL ? { baseURL: provider.baseURL } : undefined,
  });
}

function toLangchainHistory(history = []) {
  return history.slice(-8).map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
  );
}

function wrapDataError(err, boardLabel) {
  const wrapped = new Error(`Failed to read ${boardLabel} board: ${err.message}`);
  wrapped.status = err.status || 502;
  wrapped.publicMessage = `Couldn't reach the ${boardLabel} board on monday.com right now. Check the board ID/token, or try again shortly.`;
  return wrapped;
}

async function loadNormalizedData() {
  const [rawWorkOrders, rawDeals] = await Promise.all([
    fetchWorkOrders().catch((e) => { throw wrapDataError(e, 'Work Orders'); }),
    fetchDeals().catch((e) => { throw wrapDataError(e, 'Deals'); }),
  ]);
  return {
    workOrders: normalizeRecords(rawWorkOrders, 'work_order'),
    deals: normalizeRecords(rawDeals, 'deal'),
  };
}

exports.handleAgentChat = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const { workOrders, deals } = await loadNormalizedData();
    const fullBi = computeBiSummary(workOrders, deals);

    const availableSectors = Object.keys(fullBi.deals.bySector).filter((s) => s !== 'Unspecified');
    const classification = classifyQuery(message, { availableSectors });

    if (classification.needsClarification) {
      return res.json({
        reply: classification.clarifyingQuestion,
        needsClarification: true,
        suggestedOptions: availableSectors,
      });
    }

    const llm = getLlm();

    const range = resolveTimeframe(classification.timeframe, {
      year: classification.timeframeYear,
      referenceDate: new Date(),
    });
    const dealsResult = filterRecordsByRange(deals, range, DEAL_DATE_TIERS);
    const woResult = filterRecordsByRange(workOrders, range, WORK_ORDER_DATE_TIERS);
    const bi = range ? computeBiSummary(woResult.matched, dealsResult.matched) : fullBi;
    // Cross-board linkage is a structural fact, not time-scoped, so it's
    // always computed over the full dataset regardless of any timeframe filter.
    const joins = computeJoinSummary(deals, workOrders);

    const caveats = [];
    if (bi.dataQuality.dealsWithMissingFields > 0) {
      caveats.push(`${bi.dataQuality.dealsWithMissingFields} of ${deals.length} deal records have missing fields.`);
    }
    if (bi.dataQuality.workOrdersWithMissingFields > 0) {
      caveats.push(`${bi.dataQuality.workOrdersWithMissingFields} of ${workOrders.length} work order records have missing fields.`);
    }
    if (range && dealsResult.excludedUndated.length > 0) {
      caveats.push(`${dealsResult.excludedUndated.length} deal(s) have no parseable date for this ${classification.timeframe} view and were excluded.`);
    }
    if (range && woResult.excludedUndated.length > 0) {
      caveats.push(`${woResult.excludedUndated.length} work order(s) have no parseable date for this ${classification.timeframe} view and were excluded.`);
    }

    const systemPrompt = `You are a Business Intelligence agent for Skylark Drones, a drone-services company.
You are given PRE-COMPUTED aggregate statistics (not raw data) from two monday.com boards --
Work Orders (operational execution) and Deals (sales pipeline). Use ONLY these numbers; never
invent figures. If something needed to answer isn't in the stats below, say so explicitly.

Detected query focus: sector=${classification.sector || 'all'}, timeframe=${range ? range.label : 'unspecified'}, metrics=${classification.metrics.join(',')}

Aggregate stats:
${JSON.stringify(bi, null, 2)}

Cross-board linkage (deals matched to their resulting work orders by client code):
${JSON.stringify({ totalDeals: joins.totalDeals, dealsWithLinkedWork: joins.dealsWithLinkedWork, dealsUnmatched: joins.dealsUnmatched, linkRate: joins.linkRate, wonDealsMissingExecution: joins.wonDealsMissingExecution }, null, 2)}

Data quality caveats to mention if relevant: ${caveats.join(' ') || 'none'}

Answer the founder's question directly, lead with the number, then 1-2 sentences of context or insight. Only mention data quality caveats when they materially affect confidence in the answer.`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      ...toLangchainHistory(history),
      new HumanMessage(message),
    ]);

    res.json({ reply: response.content, needsClarification: false, caveats });
  } catch (error) {
    next(error);
  }
};

// Optional requirement: prep a leadership-ready summary
exports.getLeadershipSummary = async (req, res, next) => {
  try {
    const { workOrders, deals } = await loadNormalizedData();
    const bi = computeBiSummary(workOrders, deals);
    const joins = computeJoinSummary(deals, workOrders);

    const llm = getLlm();
    const systemPrompt = `Write a concise, founder-ready leadership update (5-7 bullet points max)
covering pipeline health, sector performance, and operational status, based ONLY on this data:
${JSON.stringify(bi, null, 2)}

Cross-board linkage: ${joins.dealsWithLinkedWork} of ${joins.totalDeals} deals (${joins.linkRate}%) have a
matched work order by client code. ${joins.wonDealsMissingExecution} deal(s) are marked Won but have no
matched work order yet -- call this out by name as a named bullet if it's greater than zero, since it's a
real leadership-relevant signal (revenue won but not yet started in execution).

Flag any data quality caveats as a final bullet. No preamble -- start directly with the bullets.`;

    const response = await llm.invoke([new SystemMessage(systemPrompt)]);
    res.json({ summary: response.content, stats: bi, joins });
  } catch (error) {
    next(error);
  }
};
