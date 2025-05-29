
/**
 * In-memory cache for stock data
 * TTL: 5 minutes for individual stock endpoints
 */
const stockDataCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Checks if cached data exists and is still valid
 * @param {string} symbol - The cache key (usually stock symbol)
 * @returns {object|null} - Cached data or null if expired/not found
 */
export function getCachedData(symbol) {
  if (!stockDataCache.has(symbol)) {
    return null;
  }

  const cachedEntry = stockDataCache.get(symbol);
  const isExpired = Date.now() - cachedEntry.timestamp > CACHE_TTL_MS;
  
  if (isExpired) {
    console.log(`[CacheService] Cache expired for ${symbol}, removing entry`);
    stockDataCache.delete(symbol);
    return null;
  }

  console.log(`[CacheService] Cache hit for ${symbol} (age: ${Math.round((Date.now() - cachedEntry.timestamp) / 1000)}s)`);
  return cachedEntry.data;
}

/**
 * Stores data in cache with timestamp
 * @param {string} symbol - The cache key (usually stock symbol)
 * @param {object} data - The data to cache
 */
export function setCachedData(symbol, data) {
  const entry = {
    data: data,
    timestamp: Date.now()
  };
  
  stockDataCache.set(symbol, entry);
  console.log(`[CacheService] Cached data for ${symbol}`);
}

/**
 * Clears all cached data
 */
export function clearCache() {
  const size = stockDataCache.size;
  stockDataCache.clear();
  console.log(`[CacheService] Cleared ${size} cache entries`);
}

/**
 * Removes a specific entry from cache
 * @param {string} symbol - The cache key to remove
 */
export function removeCachedData(symbol) {
  const removed = stockDataCache.delete(symbol);
  if (removed) {
    console.log(`[CacheService] Removed cache entry for ${symbol}`);
  }
  return removed;
}

/**
 * Gets cache statistics
 * @returns {object} - Cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;

  for (const [symbol, entry] of stockDataCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  }

  return {
    totalEntries: stockDataCache.size,
    validEntries: validEntries,
    expiredEntries: expiredEntries,
    cacheHitRate: null, // Would need to track hits/misses to calculate
    ttlMs: CACHE_TTL_MS
  };
}

/**
 * Cleans up expired entries from cache
 * @returns {number} - Number of entries removed
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  let removedCount = 0;

  for (const [symbol, entry] of stockDataCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      stockDataCache.delete(symbol);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`[CacheService] Cleaned up ${removedCount} expired cache entries`);
  }

  return removedCount;
}
