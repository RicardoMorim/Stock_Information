import Alpaca from "@alpacahq/alpaca-trade-api";

const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true 
});

/**
 * Fetches historical bar data for a given symbol from Alpaca using direct API calls.
 * @param {string} symbol - The stock or crypto symbol (e.g., "AAPL" or "BTC/USD").
 * @param {number} days - Number of past daily bars to fetch.
 * @param {boolean} isCrypto - Flag to indicate if the symbol is a cryptocurrency.
 * @returns {Promise<Array<{t: number, c: number}>|null>} - Array of historical bars or null on error.
 */
export async function getAlpacaHistoricalBars(symbol, days = 7, isCrypto = false) {
  try {
  let baseUrl;
  const encodedSymbol = encodeURIComponent(symbol); 

  if (isCrypto) {
    baseUrl = 'https://data.alpaca.markets/v1beta3/crypto/us/bars';
  } else {
    baseUrl = 'https://data.alpaca.markets/v2/stocks/bars';
  }

  const timeframe = "1D"; // Daily bars
  const url = `${baseUrl}?symbols=${encodedSymbol}&timeframe=${timeframe}&limit=${days}&sort=desc`; // Fetch most recent `days` bars


  const response = await fetch(url, {
    headers: {
    'APCA-API-KEY-ID': process.env.ALPACA_KEY,
    'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Alpaca Historical Bars API Error for ${symbol} (${response.status} ${response.statusText}): ${errorBody}`);
    // Do not throw here, return null to allow fallback
    return null;
  }

  const data = await response.json();

  // response structure for bars: data.bars is an object where keys are symbols.
  const actualBars = data.bars && data.bars[symbol] ? data.bars[symbol] : [];

  if (actualBars && actualBars.length > 0) {
    // Sort bars by timestamp 't' in ascending order
    actualBars.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
    return actualBars.map(bar => ({
    t: new Date(bar.t).getTime(), // Convert timestamp to milliseconds
    c: bar.c,                   // alpaca bar close price is 'c'
    }));
  }
  return []; 
  } catch (error) {
  console.error(`Error in getAlpacaHistoricalBars for ${symbol}:`, error.message || error);
  if (error.message && (error.message.includes('not found') || error.message.includes('not recognized'))) {
    console.warn(`Symbol ${symbol} not found or not recognized on Alpaca for historical bars.`);
  }
  return null; 
  }
}

/**
 * Fetches snapshot data for given symbols from Alpaca using direct API calls.
 * @param {string[]} symbols - Array of stock or crypto symbols.
 * @param {boolean} isCrypto - Flag to indicate if the symbols are cryptocurrencies.
 * @returns {Promise<Object|null>} - Object mapping symbols to their snapshot data, or null on error.
 */
export async function getAlpacaSnapshots(symbols, isCrypto = false) {
  const API_KEY = process.env.ALPACA_KEY;
  const SECRET_KEY = process.env.ALPACA_SECRET_KEY;

  if (!API_KEY || !SECRET_KEY) {
  console.error("[getAlpacaSnapshots] Alpaca API key or secret key is not defined.");
  return {};
  }

  let baseUrl;
  let symbolsQueryParam;

  if (isCrypto) {
  baseUrl = 'https://data.alpaca.markets/v1beta3/crypto/us/snapshots';
  symbolsQueryParam = symbols.map(symbol => symbol.replace(/\//g, '%2F')).join(',');
  } else {
  baseUrl = 'https://data.alpaca.markets/v2/stocks/snapshots';
  symbolsQueryParam = symbols.join(',');
  }

  const url = `${baseUrl}?symbols=${symbolsQueryParam}`;
  console.log(`[getAlpacaSnapshots] Target URL: ${url} (isCrypto: ${isCrypto})`);

  console.log(`[getAlpacaSnapshots] Attempting to fetch URL: ${url}`);

  try {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
    'APCA-API-KEY-ID': API_KEY,
    'APCA-API-SECRET-KEY': SECRET_KEY,
    'Accept': 'application/json'
    },
  });

  const responseText = await response.text(); 

  if (!response.ok) {
    console.error(`[getAlpacaSnapshots] API Error for symbols "${symbolsQueryParam}" (isCrypto: ${isCrypto}): ${response.status} ${response.statusText}. Response body: ${responseText}`);
    return {}; 
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error(`[getAlpacaSnapshots] Failed to parse JSON response for symbols "${symbolsQueryParam}" (isCrypto: ${isCrypto}). Response body: ${responseText}`, e);
    return {};
  }
  
  console.log(`[getAlpacaSnapshots] Raw data for symbols "${symbolsQueryParam}" (isCrypto: ${isCrypto}):`, JSON.stringify(data, null, 2));

  if (isCrypto) {
    if (data && data.snapshots) {
    // for crypto, Alpaca nests snapshots under a "snapshots" key.
    // the keys within data.snapshots should be the original symbols, "BTC/USD".
    return data.snapshots; 
    } else {
    console.warn(`[getAlpacaSnapshots] Crypto response for "${symbolsQueryParam}" did not contain a 'snapshots' field or data was null/undefined. Data:`, data);
    return {};
    }
  } else {

    return data || {};
  }

  } catch (error) {
  console.error(`[getAlpacaSnapshots] Network or other fetch error for symbols "${symbolsQueryParam}" (isCrypto: ${isCrypto}):`, error, error.cause ? `Cause: ${JSON.stringify(error.cause)}` : '');
  return {};
  }
}

/**
 * Fetches a single snapshot for a stock or crypto symbol from Alpaca and formats it.
 * @param {string} symbol - The stock or crypto symbol (e.g., "AAPL" or "BTC/USD").
 * @param {boolean} isCrypto - Flag to indicate if the symbol is a cryptocurrency.
 * @returns {Promise<object|null>} - Formatted snapshot data or null on error/no data.
 */
export async function getAlpacaSnapshot(symbol, isCrypto = false) {
  const API_KEY = process.env.ALPACA_KEY;
  const SECRET_KEY = process.env.ALPACA_SECRET_KEY;

  if (!API_KEY || !SECRET_KEY) {
    console.error("[getAlpacaSnapshot] Alpaca API key or secret key is not defined.");
    return null;
  }

  let baseUrl;
  // Alpaca uses different symbol formats for stocks (AAPL) vs crypto (BTC/USD)
  const alpacaSymbol = isCrypto ? symbol : symbol.toUpperCase();
  const encodedSymbol = encodeURIComponent(alpacaSymbol);

  if (isCrypto) {
    baseUrl = `https://data.alpaca.markets/v1beta3/crypto/us/snapshots?symbols=${encodedSymbol}`;
  } else {
    baseUrl = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodedSymbol}`;
  }

  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': API_KEY,
        'APCA-API-SECRET-KEY': SECRET_KEY,
        'Accept': 'application/json'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getAlpacaSnapshot] API Error for symbol "${alpacaSymbol}" (isCrypto: ${isCrypto}): ${response.status} ${response.statusText}. Body: ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    // Alpaca returns snapshots in an object where keys are symbols.
    // For crypto, it's nested: data.snapshots["BTC/USD"]
    // For stocks, it's direct: data["AAPL"]
    const snapshotData = isCrypto ? (data.snapshots ? data.snapshots[alpacaSymbol] : null) : data[alpacaSymbol];

    if (!snapshotData) {
      console.warn(`[getAlpacaSnapshot] No snapshot data found for symbol "${alpacaSymbol}" in Alpaca response. Data:`, data);
      return null;
    }

    // Format the snapshot data to the structure expected by route.js
    // Alpaca snapshot structure varies for stocks vs crypto.
    // Stocks: snapshotData.latestTrade, snapshotData.dailyBar, snapshotData.prevDailyBar
    // Crypto: snapshotData.latestTrade, snapshotData.dailyBar (prevDailyBar might be missing or need calculation)
    
    let formattedSnapshot = {
        latestTrade: { 
            p: snapshotData.latestTrade?.p || null, 
            x: snapshotData.latestTrade?.x || null // Exchange ID
        },
        dailyBar: {
            o: snapshotData.dailyBar?.o || null,
            h: snapshotData.dailyBar?.h || null,
            l: snapshotData.dailyBar?.l || null,
            c: snapshotData.dailyBar?.c || null,
            v: snapshotData.dailyBar?.v || null,
        },
        prevDailyBar: {
            c: snapshotData.prevDailyBar?.c || null,
            // Alpaca crypto snapshots might not have prevDailyBar directly.
            // If needed, it would require a separate historical fetch for the previous day.
        },
        name: symbol, // Alpaca snapshot doesn't usually include the full name
        type: isCrypto ? 'Crypto' : 'Stock', // Basic type, can be enriched by DB lookup
        exchange: snapshotData.latestTrade?.x || (isCrypto ? 'Crypto Exchange' : 'US Equity'), // Primary exchange if available
        source: 'Alpaca',
        isDelayed: false, // Alpaca data is generally real-time for US equities
    };

    // If dailyBar.c is null but latestTrade.p is available, use latestTrade.p as current close
    if (formattedSnapshot.dailyBar.c === null && formattedSnapshot.latestTrade.p !== null) {
        formattedSnapshot.dailyBar.c = formattedSnapshot.latestTrade.p;
    }

    // If prevDailyBar.c is null for crypto, it might need to be fetched or handled
    if (isCrypto && formattedSnapshot.prevDailyBar.c === null) {
        console.warn(`[getAlpacaSnapshot] Previous day close not available in crypto snapshot for ${symbol}. May need separate fetch.`);
        // For now, we leave it null. The main route can decide how to handle this (e.g., another API call).
    }

    return formattedSnapshot;

  } catch (error) {
    console.error(`[getAlpacaSnapshot] Network or other fetch error for symbol "${alpacaSymbol}" (isCrypto: ${isCrypto}):`, error);
    return null;
  }
}

/**
 * Fetches news articles for a given symbol from Alpaca.
 * @param {string} symbol - The stock/crypto symbol.
 * @param {number} limit - Max number of articles to return.
 * @returns {Promise<Array<object>|null>} - Array of news articles or null.
 */
export async function getAlpacaNews(symbol, limit = 10) {
  const API_KEY = process.env.ALPACA_KEY;
  const SECRET_KEY = process.env.ALPACA_SECRET_KEY;

  if (!API_KEY || !SECRET_KEY) {
    console.error("[getAlpacaNews] Alpaca API key or secret key is not defined.");
    return null;
  }

  // Alpaca news API uses comma-separated symbols
  const alpacaSymbol = symbol.toUpperCase(); // Stocks are uppercase, crypto might be case-sensitive depending on API version
  const encodedSymbol = encodeURIComponent(alpacaSymbol);
  
  // Endpoint: /v1beta1/news (this is an older version, check if there's a newer one)
  const url = `https://data.alpaca.markets/v1beta1/news?symbols=${encodedSymbol}&limit=${limit}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': API_KEY,
        'APCA-API-SECRET-KEY': SECRET_KEY,
        'Accept': 'application/json'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getAlpacaNews] API Error for symbol "${alpacaSymbol}": ${response.status} ${response.statusText}. Body: ${errorText}`);
      return null;
    }

    const data = await response.json();

    if (data.news && data.news.length > 0) {
      return data.news.map(article => ({
        id: article.id || article.ID, // Alpaca might use ID or id
        headline: article.headline,
        summary: article.summary || article.content || '', // content might be available
        source_name: article.source || 'Alpaca', // Alpaca news items have a 'source' field
        url: article.url || article.URL,
        image_url: article.images && article.images.length > 0 ? article.images[0].url : null,
        published_at: article.created_at || article.updated_at, // Timestamps
        symbols: article.symbols || [symbol],
        source_api: 'Alpaca',
      }));
    } else {
      console.log(`[getAlpacaNews] No news found for symbol "${alpacaSymbol}" from Alpaca.`);
      return [];
    }

  } catch (error) {
    console.error(`[getAlpacaNews] Network or other fetch error for symbol "${alpacaSymbol}":`, error);
    return null;
  }
}


export default alpaca;
