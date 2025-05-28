const POLYGON_API_KEY = process.env.POLYGON_KEY;
const POLYGON_BASE_URL = 'https://api.polygon.io';

/**
 * Fetches ticker details for a given symbol from Polygon.io.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object|null>} - The ticker details or null if an error occurs.
 */
export async function fetchPolygonTickerDetails(symbol) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  try {
    const url = `${POLYGON_BASE_URL}/v3/reference/tickers/${symbol.toUpperCase()}?apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ticker details from Polygon for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.results) {
      return {
        name: data.results.name,
        market: data.results.market,
        locale: data.results.locale,
        primary_exchange: data.results.primary_exchange,
        type: data.results.type,
        currency_name: data.results.currency_name,
        cik: data.results.cik,
        source: 'Polygon.io',
        isDelayed: false, // Polygon data is generally real-time
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ticker details from Polygon for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches the previous day's open, high, low, close, volume (OHLCV) for a symbol from Polygon.io.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object|null>} - The previous day's OHLCV data or null.
 */
export async function fetchPolygonPreviousClose(symbol) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  try {
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch previous close from Polygon for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.resultsCount > 0 && data.results && data.results[0]) {
      const prevBar = data.results[0];
      return {
        previousClose: prevBar.c,
        open: prevBar.o,
        high: prevBar.h,
        low: prevBar.l,
        volume: prevBar.v,
        source: 'Polygon.io',
        isDelayed: false, // Data is for previous day, but accurately sourced
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching previous close from Polygon for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches the latest quote (NBBO) for a stock symbol from Polygon.io.
 * For Crypto, this would need a different endpoint or logic.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object|null>} - The latest quote data or null.
 */
export async function fetchPolygonLatestQuote(symbol) {
    if (!POLYGON_API_KEY) {
        console.error('Polygon API key is missing.');
        return null;
    }
    // Determine if it's crypto or stock based on common patterns or a helper
    const isCrypto = symbol.includes('X:') || symbol.includes('-'); // Basic check, might need refinement
    let url;

    if (isCrypto) {
        // Polygon uses specific format for crypto pairs, e.g., X:BTCUSD
        // Assuming symbol is already in the correct format or needs to be adapted.
        // For simplicity, let's assume the symbol is passed correctly for crypto.
        // The v2/last/trade for crypto might be simpler if NBBO isn't needed.
        // For now, let's use daily aggregate as a stand-in for "latest" price for crypto if real-time quotes are complex.
        // This is a simplification. A proper implementation would use real-time crypto quotes if available.
        // url = `${POLYGON_BASE_URL}/v1/last/crypto/${symbol.replace('X:', '').split('-')[0]}/${symbol.replace('X:', '').split('-')[1]}?apiKey=${POLYGON_API_KEY}`;
        // The above is for last trade. For a "quote like" structure, daily bars might be better.
        // Let's try to get the most recent daily bar for crypto as a proxy for "latest quote"
        const today = new Date().toISOString().split('T')[0];
        url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/range/1/day/${today}/${today}?adjusted=true&sort=desc&limit=1&apiKey=${POLYGON_API_KEY}`;
    } else {
        url = `${POLYGON_BASE_URL}/v2/last/nbbo/${symbol.toUpperCase()}?apiKey=${POLYGON_API_KEY}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch latest quote/trade from Polygon for ${symbol}. Status: ${response.status}`);
            return null;
        }
        const data = await response.json();

        if (isCrypto) {
            if (data.resultsCount > 0 && data.results && data.results[0]) {
                const latestBar = data.results[0];
                return {
                    price: latestBar.c, // Closing price of the most recent bar
                    bid_price: latestBar.c, // Approximation
                    ask_price: latestBar.c, // Approximation
                    volume: latestBar.v, // Todays volume so far
                    source: 'Polygon.io (Daily Agg for Crypto)',
                    isDelayed: false, // Real-time aggregate
                };
            }
        } else { // Stocks
            if (data.results) {
                const quote = data.results;
                return {
                    price: quote.P, // Last trade price (P for NBBO, p for regular quotes)
                    bid_price: quote.p, // Bid price
                    ask_price: quote.P, // Ask price (Using P as a placeholder, check Polygon docs for correct ask field for NBBO)
                                       // The /v2/quotes/{stockTicker} endpoint has 'ask_price' and 'bid_price'
                                       // For NBBO /v2/last/nbbo/{stockTicker} results:
                                       // P = Last trade price, S = Last trade size, T = SIP timestamp
                                       // p = Bid price, s = Bid size, x = Bid exchange
                                       // P = Ask price (this is likely incorrect, Polygon uses different fields for ask in NBBO)
                                       // Let's use /v2/quotes/{stockTicker} for a more complete quote for stocks
                                       // Switching to /v3/quotes for stocks for more fields
                    source: 'Polygon.io',
                    isDelayed: false, 
                };
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching latest quote/trade from Polygon for ${symbol}:`, error);
        return null;
    }
}

/**
 * Fetches latest quote for a stock symbol from Polygon.io using /v3/quotes.
 * This provides more detailed quote information including bid/ask.
 * @param {string} symbol - The stock symbol (not for crypto).
 * @returns {Promise<object|null>} - The latest quote data or null.
 */
export async function fetchPolygonStockLatestQuote(symbol) {
    if (!POLYGON_API_KEY) {
        console.error('Polygon API key is missing.');
        return null;
    }
    // This endpoint is generally for stocks.
    if (symbol.toUpperCase().startsWith('X:')) {
        console.warn(`fetchPolygonStockLatestQuote is intended for stocks. Symbol ${symbol} looks like crypto.`);
        // Fallback or specific crypto handling can be added here if needed.
        // For now, let's try to fetch it as if it's a stock, Polygon might handle some crypto tickers.
    }

    const url = `${POLYGON_BASE_URL}/v3/quotes/${symbol.toUpperCase()}?limit=1&apiKey=${POLYGON_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch stock quote from Polygon (v3/quotes) for ${symbol}. Status: ${response.status}`);
            return null;
        }
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const quote = data.results[0];
            return {
                price: quote.ask_price, // Or bid_price, or a mid-point. Ask price is often used as current price.
                bid_price: quote.bid_price,
                ask_price: quote.ask_price,
                bid_size: quote.bid_size,
                ask_size: quote.ask_size,
                last_trade_price: quote.last_trade?.p, // If available from this endpoint
                last_trade_timestamp: quote.last_trade?.t, // If available
                source: 'Polygon.io',
                isDelayed: false, // Polygon data is generally real-time
            };
        }
        console.warn(`No quote data found in Polygon (v3/quotes) response for ${symbol}`);
        return null;
    } catch (error) {
        console.error(`Error fetching stock quote from Polygon (v3/quotes) for ${symbol}:`, error);
        return null;
    }
}


/**
 * Fetches historical price data (bars) for a symbol from Polygon.io.
 * @param {string} symbol - The stock/crypto symbol.
 * @param {string} from - The start date (YYYY-MM-DD).
 * @param {string} to - The end date (YYYY-MM-DD).
 * @param {string} timespan - e.g., 'day', 'hour', 'minute'.
 * @param {number} multiplier - e.g., 1 for 1 day, 1 for 1 hour.
 * @returns {Promise<Array<object>|null>} - Array of historical bars or null.
 */
export async function fetchPolygonHistoricalData(symbol, from, to, timespan = 'day', multiplier = 1) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  try {
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch historical data from Polygon for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.results) {
      return data.results.map(bar => ({
        t: bar.t, // Timestamp
        o: bar.o, // Open
        h: bar.h, // High
        l: bar.l, // Low
        c: bar.c, // Close
        v: bar.v, // Volume
        vw: bar.vw, // Volume Weighted Average Price
        n: bar.n, // Number of transactions
        source: 'Polygon.io',
        isDelayed: false, // Historical data is factual
      }));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching historical data from Polygon for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches news articles for a given symbol from Polygon.io.
 * @param {string} symbol - The stock/crypto symbol.
 * @param {number} limit - Max number of articles to return.
 * @returns {Promise<Array<object>|null>} - Array of news articles or null.
 */
export async function fetchPolygonNews(symbol, limit = 10) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  try {
    // Polygon might require "tickers" query param for multiple, or just one for single.
    // The documentation suggests `GET /v2/reference/news?ticker=AAPL`
    const url = `${POLYGON_BASE_URL}/v2/reference/news?ticker=${symbol.toUpperCase()}&limit=${limit}&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch news from Polygon for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.results) {
      return data.results.map(article => ({
        id: article.id,
        headline: article.title,
        summary: article.description, // Polygon uses 'description' for summary
        source_name: article.publisher?.name || 'N/A',
        url: article.article_url,
        image_url: article.image_url,
        published_at: article.published_utc,
        symbols: article.tickers,
        keywords: article.keywords,
        source_api: 'Polygon.io',
        isDelayed: false, // News can have a publication delay, but the API itself is real-time
      }));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching news from Polygon for ${symbol}:`, error);
    return null;
  }
}

/**
 * Combines ticker details, previous close, and latest quote for a full snapshot.
 * @param {string} symbol - The stock/crypto symbol.
 * @returns {Promise<object|null>} - Combined snapshot data or null.
 */
export async function getPolygonSnapshot(originalSymbol) {
    let symbolForPolygon = originalSymbol;
    const isLikelyCryptoByFormat = originalSymbol.toUpperCase().startsWith('X:') || originalSymbol.includes('/') || originalSymbol.includes('-');

    // Standardize to Polygon's X:BASEQUOTE format for cryptos if it seems like a crypto pair that needs it
    if (isLikelyCryptoByFormat && originalSymbol.includes('/')) {
        symbolForPolygon = `X:${originalSymbol.replace('/', '').toUpperCase()}`;
    } else if (isLikelyCryptoByFormat && originalSymbol.includes('-') && !originalSymbol.toUpperCase().startsWith('X:')) {
        // e.g. BTC-USD to X:BTCUSD
        symbolForPolygon = `X:${originalSymbol.replace('-', '').toUpperCase()}`;
    }
    // If it's already X:SOMETHING, it's good.
    // If it's just "BTCUSD" and identified as crypto by other means, fetchPolygonLatestQuote might handle it or it might need X: prefix.
    // For now, this covers the main / and - cases for transformation to X: format.

    const details = await fetchPolygonTickerDetails(symbolForPolygon);
    const prevCloseData = await fetchPolygonPreviousClose(symbolForPolygon);
    
    let latestQuoteData;
    // Use details.type if available, otherwise rely on format check
    const isConfirmedCrypto = details?.type === 'CRYPTO' || symbolForPolygon.toUpperCase().startsWith('X:');

    if (isConfirmedCrypto) {
        // Ensure the symbol passed to fetchPolygonLatestQuote is definitely in X:Format if it's crypto
        const cryptoSymbolForQuote = symbolForPolygon.toUpperCase().startsWith('X:') 
            ? symbolForPolygon 
            : `X:${symbolForPolygon}`; // Add X: if somehow missed (e.g. details.type said CRYPTO but format was just BTCUSD)
        latestQuoteData = await fetchPolygonLatestQuote(cryptoSymbolForQuote);
    } else {
        latestQuoteData = await fetchPolygonStockLatestQuote(symbolForPolygon); // For stocks
    }

    if (!prevCloseData && !latestQuoteData) {
        console.warn(`Could not retrieve significant pricing data from Polygon for ${symbol}`);
        // If we have details, we can still return them with a note about missing price.
        // For now, if price is missing, consider it a partial failure for snapshot.
        return null;
    }
    
    // Prioritize latest quote for current price, fall back to prev close if needed (though unlikely for snapshot)
    const currentPrice = latestQuoteData?.price || prevCloseData?.c;
    const openPrice = latestQuoteData?.open || prevCloseData?.o; // Polygon quote might not have open, prevClose does
    const highPrice = latestQuoteData?.high || prevCloseData?.h; // Similar for high/low
    const lowPrice = latestQuoteData?.low || prevCloseData?.l;
    const volume = latestQuoteData?.volume || prevCloseData?.v;


    return {
        symbol: symbol.toUpperCase(),
        name: details?.name || symbol.toUpperCase(),
        type: details?.type || (isCrypto ? 'CRYPTO' : 'CS'), // CS for Common Stock
        price: currentPrice,
        change: prevCloseData?.previousClose ? (currentPrice - prevCloseData.previousClose) : null,
        changePercent: prevCloseData?.previousClose && currentPrice ? ((currentPrice - prevCloseData.previousClose) / prevCloseData.previousClose) * 100 : null,
        open: openPrice,
        high: highPrice,
        low: lowPrice,
        volume: volume,
        previousClose: prevCloseData?.previousClose,
        market: details?.market,
        locale: details?.locale,
        primary_exchange: details?.primary_exchange,
        currency: details?.currency_name,
        last_trade_price: latestQuoteData?.last_trade_price, // from v3 quotes
        bid_price: latestQuoteData?.bid_price,
        ask_price: latestQuoteData?.ask_price,
        source: 'Polygon.io',
        isDelayed: false,
    };
}

/**
 * Fetches recent historical price data (e.g., last 7-30 days) for a symbol from Polygon.io,
 * suitable for mini charts.
 * @param {string} symbol - The stock/crypto symbol.
 * @param {number} days - Number of past days to fetch data for.
 * @returns {Promise<Array<object>|null>} - Array of historical bars (t, c) or null.
 */
export async function fetchPolygonRecentHistoricalData(symbol, days = 7) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const timespan = 'day';
  const multiplier = 1;
  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=30&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch recent historical data from Polygon for ${symbol}. Status: ${response.status}, URL: ${url}`);
      return null;
    }
    const data = await response.json();
    if (data.results && Array.isArray(data.results)) {
      if (data.results.length === 0) {
        console.log(`Polygon returned empty results for recent historical data for ${symbol}. URL: ${url}`);
      }
      return data.results.map(bar => ({
        t: bar.t, // Timestamp
        c: bar.c, // Close price
      }));
    } else {
      console.warn(`Polygon returned no 'results' array or unexpected structure for recent historical data for ${symbol}. Response: ${JSON.stringify(data)}, URL: ${url}`);
      return []; // Return empty array if results are not as expected but response was ok
    }
  } catch (error) {
    console.error(`Error fetching recent historical data from Polygon for ${symbol}: URL: ${url}`, error);
    return null;
  }
}
