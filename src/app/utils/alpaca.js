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

export default alpaca;
