import Alpaca from "@alpacahq/alpaca-trade-api";
import dns from 'dns'; // Import the dns module

const alpaca = new Alpaca({
	keyId: process.env.ALPACA_KEY,
	secretKey: process.env.ALPACA_SECRET_KEY,
	paper: true // Set to false for live trading
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
    const encodedSymbol = encodeURIComponent(symbol); // URL encode the symbol

    if (isCrypto) {
      baseUrl = 'https://data.alpaca.markets/v1beta3/crypto/us/bars';
    } else {
      baseUrl = 'https://data.alpaca.markets/v2/stocks/bars';
    }

    const timeframe = "1D"; // Daily bars
    const url = `${baseUrl}?symbols=${encodedSymbol}&timeframe=${timeframe}&limit=${days}&sort=desc`; // Fetch most recent `days` bars

    // console.log(`Fetching Alpaca historical bars from URL: ${url}`); // For debugging

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

    // Response structure for bars: data.bars is an object where keys are symbols.
    const actualBars = data.bars && data.bars[symbol] ? data.bars[symbol] : [];

    if (actualBars && actualBars.length > 0) {
      // Bars are typically returned in ascending order by default from Alpaca if not specifying start/end.
      // If sort=desc is used, they are descending. The chart expects ascending.
      // Let's ensure they are ascending by timestamp for the chart.
      actualBars.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
      return actualBars.map(bar => ({
        t: new Date(bar.t).getTime(), // Alpaca bar timestamp 't' is usually ISO 8601
        c: bar.c,                   // Alpaca bar close price is 'c'
      }));
    }
    // console.log(`Alpaca returned no historical bars for ${symbol} (encoded: ${encodedSymbol}). Response:`, JSON.stringify(data));
    return []; // Return empty array if no bars found, consistent with Polygon util
  } catch (error) {
    console.error(`Error in getAlpacaHistoricalBars for ${symbol}:`, error.message || error);
    if (error.message && (error.message.includes('not found') || error.message.includes('not recognized'))) {
        console.warn(`Symbol ${symbol} not found or not recognized on Alpaca for historical bars.`);
    }
    return null; // Return null on error to trigger fallback
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
  let hostname; // To store the hostname for dns.lookup
  let symbolsQueryParam;

  if (isCrypto) {
    baseUrl = 'https://data.alpaca.markets/v1beta3/crypto/us/snapshots';
    hostname = 'data.alpaca.markets';
    symbolsQueryParam = symbols.map(symbol => symbol.replace(/\//g, '%2F')).join(',');
  } else {
    baseUrl = 'https://data.alpaca.markets/v2/stocks/snapshots';
    hostname = 'data.alpaca.markets'; // Same hostname for stock snapshots
    symbolsQueryParam = symbols.join(',');
  }

  const url = `${baseUrl}?symbols=${symbolsQueryParam}`;
  console.log(`[getAlpacaSnapshots] Target URL: ${url} (isCrypto: ${isCrypto})`);

  // Test DNS lookup directly within Node.js
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    console.log(`[getAlpacaSnapshots] Node.js DNS lookup for ${hostname} successful:`, addresses);
  } catch (dnsError) {
    console.error(`[getAlpacaSnapshots] Node.js DNS lookup FAILED for ${hostname}:`, dnsError);
    // Optionally, you could return early here if DNS lookup fails,
    // as fetch will likely fail too.
    // return {}; 
  }

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

    const responseText = await response.text(); // Get text for logging in case of non-JSON or errors

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
        // For crypto, Alpaca nests snapshots under a "snapshots" key.
        // The keys within data.snapshots should be the original symbols, e.g., "BTC/USD".
        return data.snapshots; 
      } else {
        console.warn(`[getAlpacaSnapshots] Crypto response for "${symbolsQueryParam}" did not contain a 'snapshots' field or data was null/undefined. Data:`, data);
        return {};
      }
    } else {
      // For stocks, the data object itself is the map of snapshots.
      return data || {};
    }

  } catch (error) {
    console.error(`[getAlpacaSnapshots] Network or other fetch error for symbols "${symbolsQueryParam}" (isCrypto: ${isCrypto}):`, error, error.cause ? `Cause: ${JSON.stringify(error.cause)}` : '');
    return {};
  }
}

export default alpaca;
