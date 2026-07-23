const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlSeconds = Number(process.env.CACHE_TTL_SECONDS || 300)) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function clear() {
  store.clear();
}

module.exports = { get, set, clear };
