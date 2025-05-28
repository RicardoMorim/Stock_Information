import Alpaca from "@alpacahq/alpaca-trade-api";

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
  if (!symbols || symbols.length === 0) {
    return {};
  }
  try {
    let baseUrl;
    let processedSymbols;

    if (isCrypto) {
      baseUrl = 'https://data.alpaca.markets/v1beta3/crypto/us/snapshots';
      // Alpaca API for crypto snapshots expects symbols like BTC/USD.
      // The `symbols` query parameter takes a comma-separated list.
      // Individual encoding of symbols like BTC/USD to BTC%2FUSD is standard.
      processedSymbols = symbols.map(s => encodeURIComponent(s));
    } else {
      baseUrl = 'https://data.alpaca.markets/v2/stocks/snapshots';
      // For stocks, Alpaca snapshot API usually expects plain tickers.
      // Strip potential exchange suffixes (e.g., ".NASDAQ") and class indicators (e.g., ".A" -> "" for BRK.A -> BRKA).
      // A simple split('.')[0] might be too naive for class indicators like "BRK.A".
      // Alpaca generally expects "BRKA" for "BRK.A".
      // For now, we'll stick to split('.').[0] for suffixes like .NASDAQ and handle more complex cases if they arise.
      processedSymbols = symbols.map(s => {
        const parts = s.split('.');
        if (parts.length > 1 && parts[parts.length - 1].length > 2) { // Likely an exchange suffix e.g. .NASDAQ
            return encodeURIComponent(parts[0]);
        }
        return encodeURIComponent(s.replace('.', '')); // For cases like BRK.A -> BRKA, or simple tickers
      });
    }
    
    const symbolsQueryParam = processedSymbols.join(',');
    const url = `${baseUrl}?symbols=${symbolsQueryParam}`;
    // console.log(`Fetching Alpaca snapshots. Original symbols: ${symbols.join(',')}, Processed for URL: ${symbolsQueryParam}, URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': process.env.ALPACA_KEY,
        'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Alpaca Snapshots API Error (${response.status} ${response.statusText}) for symbols ${symbols.join(',')} (processed: ${symbolsQueryParam}): ${errorBody}`);
      return null;
    }

    const data = await response.json();

    const snapshots = {};
    if (data) {
      if (isCrypto) {
        symbols.forEach(originalSymbol => { // e.g., "BTC/USD"
          const encodedOriginalSymbol = encodeURIComponent(originalSymbol); // "BTC%2FUSD"
          // Alpaca might use the plain symbol "BTC/USD", the encoded "BTC%2FUSD", or a normalized "BTCUSD" as a key.
          const normalizedSymbol = originalSymbol.includes('/') ? originalSymbol.replace('/', '') : originalSymbol; // "BTCUSD"

          if (data[originalSymbol]) { // Check for "BTC/USD"
            snapshots[originalSymbol] = data[originalSymbol];
          } else if (data[encodedOriginalSymbol]) { // Check for "BTC%2FUSD"
            snapshots[originalSymbol] = data[encodedOriginalSymbol];
          } else if (data[normalizedSymbol]) { // Check for "BTCUSD"
            snapshots[originalSymbol] = data[normalizedSymbol];
          } else {
            // console.warn(`Alpaca snapshot data not found for crypto ${originalSymbol} using keys ${originalSymbol}, ${encodedOriginalSymbol}, or ${normalizedSymbol}. Available keys in response: ${Object.keys(data).join(', ')}`);
          }
        });
      } else { // Stocks
        symbols.forEach(originalSymbol => {
          // Determine the symbol form Alpaca likely used as a key in the response, based on our processing logic.
          let expectedKeyInResponse;
          const parts = originalSymbol.split('.');
          if (parts.length > 1 && parts[parts.length - 1].length > 2) { // Was an exchange suffix like .NASDAQ
            expectedKeyInResponse = parts[0]; // e.g., "AMZN"
          } else {
            expectedKeyInResponse = originalSymbol.replace('.', ''); // e.g., "BRKA" from "BRK.A", or "AAPL" from "AAPL"
          }
          
          if (data[expectedKeyInResponse]) {
            snapshots[originalSymbol] = data[expectedKeyInResponse];
          } else if (data[originalSymbol]) { // Fallback to original symbol, just in case
             snapshots[originalSymbol] = data[originalSymbol];
          } else {
            // console.warn(`Alpaca snapshot data not found for stock ${originalSymbol} using key ${expectedKeyInResponse} or ${originalSymbol}. Available keys in response: ${Object.keys(data).join(', ')}`);
          }
        });
      }
    }
    return snapshots;

  } catch (error) {
    console.error(`Error in getAlpacaSnapshots for symbols ${JSON.stringify(symbols)}:`, error.message || error);
    return null; // Return null on error
  }
}

export default alpaca;
