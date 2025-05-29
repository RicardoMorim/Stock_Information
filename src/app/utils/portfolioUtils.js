import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
const redis = Redis.fromEnv();

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const YH_FINANCE_KEY = process.env.YH_KEY;

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_DURATION_SECONDS = 5 * 60; // 5 minutes for Redis 'ex' option

const yahooExchangeMap = {
    '.US': '',     // No suffix for US stocks
    '.ES': '.MC',  // Madrid
    '.IT': '.MI',  // Milan
    '.PL': '.WA',  // Warsaw
    '.UK': '.L',   // London
    '.FR': '.PA',  // Paris
    '.DE': '.DE',  // Germany
    '.NL': '.AS'   // Amsterdam
};

/**
 * Fetches current stock prices from Alpaca and Yahoo Finance with caching using Upstash Redis.
 * @param {string[]} symbols - Array of stock symbols.
 * @returns {Promise<Object>} Object mapping symbols to their price and currency.
 */
export async function fetchStockPrices(symbols) {
    console.log(`[FetchPrices] Requested symbols: ${symbols.join(', ')}`);
    const pricesToReturn = {};
    const symbolsToActuallyFetch = [];

    // Phase 1: Check Upstash Redis cache
    for (const symbol of symbols) {
        const cacheKey = `stockprice:${symbol}`;
        try {
            // Upstash Redis can store objects directly, it handles JSON stringification/parsing.
            const cachedEntry = await redis.get(cacheKey); 
            if (cachedEntry && cachedEntry.timestamp && (Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS)) {
                pricesToReturn[symbol] = { price: cachedEntry.price, currency: cachedEntry.currency };
                console.log(`[Redis Cache] Used cached price for ${symbol}:`, pricesToReturn[symbol]);
            } else {
                symbolsToActuallyFetch.push(symbol);
                if (cachedEntry) {
                    console.log(`[Redis Cache] Stale or invalid timestamp for ${symbol}. Will re-fetch.`);
                } else {
                    console.log(`[Redis Cache] No or expired cache for ${symbol}`);
                }
            }
        } catch (error) {
            console.error(`[Redis Cache] Error reading from Redis for ${symbol}:`, error);
            symbolsToActuallyFetch.push(symbol); // Fetch if cache read fails
        }
    }

    if (symbolsToActuallyFetch.length === 0 && symbols.length > 0) {
        console.log('[FetchPrices] All requested prices served from Redis cache.');
        return pricesToReturn;
    }
    if (symbolsToActuallyFetch.length > 0) {
       console.log(`[FetchPrices] Redis Cache miss or expired for: ${symbolsToActuallyFetch.join(', ')}. Attempting fetch...`);
    }

    const alpacaFetchedSymbols = new Set();

    // Phase 2: Fetch from Alpaca
    if (symbolsToActuallyFetch.length > 0 && ALPACA_API_KEY && ALPACA_SECRET_KEY) {
        try {
            const currentSymbolsToQueryAlpaca = symbolsToActuallyFetch.filter(s => !alpacaFetchedSymbols.has(s));
            if (currentSymbolsToQueryAlpaca.length > 0) {
                const alpacaQuerySymbols = currentSymbolsToQueryAlpaca.join(',');
                console.log(`[Alpaca] Querying for: ${alpacaQuerySymbols}`);
                const alpacaResponse = await fetch(
                    `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${alpacaQuerySymbols}`,
                    { headers: { 'APCA-API-KEY-ID': ALPACA_API_KEY, 'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY } }
                );

                if (alpacaResponse.ok) {
                    const alpacaData = await alpacaResponse.json();
                    for (const symbol of currentSymbolsToQueryAlpaca) { 
                        if (alpacaData[symbol]?.latestTrade?.p) {
                            const price = alpacaData[symbol].latestTrade.p;
                            pricesToReturn[symbol] = { price, currency: 'USD' };
                            const cacheKey = `stockprice:${symbol}`;
                            const valueToCache = { price, currency: 'USD', timestamp: Date.now() };
                            try {
                                // Use 'ex' for expiration in seconds
                                await redis.set(cacheKey, valueToCache, { ex: CACHE_DURATION_SECONDS });
                                console.log(`[Redis Cache] Set Alpaca price for ${symbol}`);
                            } catch (error) {
                                console.error(`[Redis Cache] Error writing Alpaca price to Redis for ${symbol}:`, error);
                            }
                            alpacaFetchedSymbols.add(symbol);
                        }
                    }
                } else {
                    console.log(`[Alpaca] API error: ${alpacaResponse.status} - ${await alpacaResponse.text()}`);
                }
            }
        } catch (error) {
            console.error('[Alpaca] Fetch error:', error.message);
        }
    }

    // Phase 3: Fetch from Yahoo Finance
    const yahooCandidateSymbols = symbolsToActuallyFetch.filter(s => !alpacaFetchedSymbols.has(s));
    if (yahooCandidateSymbols.length > 0 && YH_FINANCE_KEY) {
        console.log(`[Yahoo] Candidate symbols: ${yahooCandidateSymbols.join(', ')}`);
        for (const symbol of yahooCandidateSymbols) {
            let yahooQuerySymbol = symbol;
            const parts = symbol.split('.');
            if (parts.length > 1) {
                const suffix = '.' + parts.pop();
                const prefix = parts.join('.');
                if (yahooExchangeMap[suffix.toUpperCase()]) {
                    yahooQuerySymbol = prefix + yahooExchangeMap[suffix.toUpperCase()];
                    console.log(`[Yahoo] Mapped ${symbol} to ${yahooQuerySymbol} for Yahoo Finance.`);
                }
            }
            
            console.log(`[Yahoo] Trying Yahoo Finance with symbol: ${yahooQuerySymbol}`);
            try {
                const yahooResponse = await fetch(
                    `https://yfapi.net/v6/finance/quote?symbols=${yahooQuerySymbol}`,
                    { headers: { 'X-API-KEY': YH_FINANCE_KEY } }
                );

                if (yahooResponse.ok) {
                    const yahooData = await yahooResponse.json();
                    const quote = yahooData.quoteResponse?.result?.[0];
                    if (quote?.regularMarketPrice) {
                        pricesToReturn[symbol] = { price: quote.regularMarketPrice, currency: quote.currency || 'USD' };
                        const cacheKey = `stockprice:${symbol}`; 
                        const valueToCache = { price: quote.regularMarketPrice, currency: quote.currency || 'USD', timestamp: Date.now() };
                        try {
                            // Use 'ex' for expiration in seconds
                            await redis.set(cacheKey, valueToCache, { ex: CACHE_DURATION_SECONDS });
                            console.log(`[Redis Cache] Set Yahoo price for ${symbol}`);
                        } catch (error) {
                            console.error(`[Redis Cache] Error writing Yahoo price to Redis for ${symbol}:`, error);
                        }
                    } else {
                        console.log(`[Yahoo] No regularMarketPrice for ${yahooQuerySymbol} in response. Quote:`, quote);
                    }
                } else {
                    console.log(`[Yahoo] API error for ${yahooQuerySymbol}: ${yahooResponse.status} - ${await yahooResponse.text()}`);
                }
            } catch (error) {
                console.error(`[Yahoo] Fetch error for ${yahooQuerySymbol}:`, error.message);
            }
        }
    }

    // Final step: Default for symbols not found
    for (const originalSymbol of symbols) {
        if (!pricesToReturn[originalSymbol]) {
            console.warn(`[FetchPrices] No price retrieved for ${originalSymbol}. Defaulting to 0 USD.`);
            pricesToReturn[originalSymbol] = { price: 0, currency: 'USD' };
        }
    }
    
    console.log('[FetchPrices] Returning final prices for this run:', pricesToReturn);
    return pricesToReturn;
}

/**
 * Fetches current exchange rates against USD.
 * @returns {Promise<Object>} Object mapping currency codes to their rates against USD.
 */
export async function getExchangeRates() {
	try {
		const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
		if (!response.ok) {
			console.error(`Error fetching exchange rates: ${response.status} ${response.statusText}`);
			return { 'EUR': 0.93, 'USD': 1, 'PLN': 4.0, 'GBP': 0.8 }; // Fallback
		}
		const data = await response.json();
		if (data && data.rates) {
			return data.rates;
		} else {
			console.error('Error fetching exchange rates: Invalid data format');
			return { 'EUR': 0.93, 'USD': 1, 'PLN': 4.0, 'GBP': 0.8 }; // Fallback
		}
	} catch (error) {
		console.error('Error fetching exchange rates:', error);
		return { 'EUR': 0.93, 'USD': 1, 'PLN': 4.0, 'GBP': 0.8 }; // Fallback
	}
}
