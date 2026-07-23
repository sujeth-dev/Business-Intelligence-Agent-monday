const axios = require('axios');
const cache = require('../utils/cache');

const MONDAY_API_URL = 'https://api.monday.com/v2';

async function postWithRetry(query, variables = {}, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        MONDAY_API_URL,
        { query, variables },
        {
          headers: {
            Authorization: process.env.MONDAY_API_TOKEN,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      if (response.data.errors) {
        throw new Error(response.data.errors.map((e) => e.message).join('; '));
      }
      return response.data.data;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Fetches ALL items on a board via cursor pagination -- required since
// monday.com boards can exceed the 100-item default page size.
async function fetchBoardItems(boardId, boardLabel) {
  if (!boardId) {
    const err = new Error(`Board ID missing for ${boardLabel}. Set it in .env -- never hardcode.`);
    err.status = 400;
    throw err;
  }

  const cacheKey = `board:${boardId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let allItems = [];
  let cursor = null;

  do {
    const query = cursor
      ? `query ($cursor: String!) {
          next_items_page (cursor: $cursor, limit: 100) {
            cursor
            items { name column_values { id text column { title } } }
          }
        }`
      : `query {
          boards (ids: ${boardId}) {
            items_page (limit: 100) {
              cursor
              items { name column_values { id text column { title } } }
            }
          }
        }`;

    const variables = cursor ? { cursor } : {};
    const data = await postWithRetry(query, variables);
    const page = cursor ? data.next_items_page : data.boards?.[0]?.items_page;
    if (!page) break;

    allItems = allItems.concat(page.items || []);
    cursor = page.cursor;
  } while (cursor);

  cache.set(cacheKey, allItems);
  return allItems;
}

const fetchWorkOrders = () => fetchBoardItems(process.env.MONDAY_WORKORDERS_BOARD_ID, 'Work Orders');
const fetchDeals = () => fetchBoardItems(process.env.MONDAY_DEALS_BOARD_ID, 'Deals');

module.exports = { fetchWorkOrders, fetchDeals, fetchBoardItems };
