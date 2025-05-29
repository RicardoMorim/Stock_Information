
import { getPolygonSnapshot } from "@/app/utils/polygon";
import { getAlpacaSnapshot } from "@/app/utils/alpaca";
import { getYahooFinanceSnapshot } from "@/app/utils/yahooFinance";
import { fetchAlphaVantageStockData } from "@/app/utils/alphaVantage";

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const YH_KEY = process.env.YH_KEY;

/**
 * Fetches current stock snapshot data with fallback mechanism
 * Tries: Polygon -> Alpaca -> Yahoo Finance -> Alpha Vantage
 * @param {string} symbol - The stock symbol to fetch
 * @param {boolean} isCrypto - Whether the symbol is a cryptocurrency
 * @returns {Promise<object|null>} - Combined snapshot data or null
 */
export async function fetchSnapshotWithFallback(symbol, isCrypto = false) {
  let snapshotDetails = null;
  let source = 'N/A';
  let isDelayed = false;
  let name = null;
  let type = null;
  let exchange = null;

  console.log(`[StockDataService] Starting fallback mechanism for ${symbol} (isCrypto: ${isCrypto})`);

  // 1. Try Polygon.io first
  try {
    console.log(`[StockDataService] Trying Polygon.io for ${symbol}...`);
    const polygonData = await getPolygonSnapshot(symbol);
    
    if (polygonData && polygonData.price !== null && polygonData.price !== undefined) {
      console.log(`[StockDataService] Polygon.io success for ${symbol}:`, {
        price: polygonData.price,
        hasLatestQuote: !!polygonData.last_trade_price,
        hasPrevClose: !!polygonData.previousClose
      });
      
      snapshotDetails = {
        latestTrade: { p: polygonData.price },
        dailyBar: {
          o: polygonData.open,
          h: polygonData.high,
          l: polygonData.low,
          c: polygonData.price,
          v: polygonData.volume,
        },
        prevDailyBar: { c: polygonData.previousClose },
      };
      source = polygonData.source || 'Polygon.io';
      isDelayed = polygonData.isDelayed || false;
      name = polygonData.name;
      type = polygonData.type;
      exchange = polygonData.primary_exchange;
    } else {
      console.log(`[StockDataService] Polygon.io returned insufficient data for ${symbol}:`, {
        dataReceived: !!polygonData,
        price: polygonData?.price,
        reason: polygonData === null ? 'null response' : 'missing/invalid price'
      });
    }
  } catch (polygonError) {
    console.error(`[StockDataService] Polygon.io error for ${symbol}:`, polygonError.message);
  }

  // 2. Try Alpaca if Polygon failed
  if (!snapshotDetails) {
    console.log(`[StockDataService] Polygon.io failed for ${symbol}, trying Alpaca...`);
    try {
      const alpacaData = await getAlpacaSnapshot(symbol, isCrypto);
      
      if (alpacaData && alpacaData.latestTrade?.p) {
        console.log(`[StockDataService] Alpaca success for ${symbol}:`, alpacaData);
        snapshotDetails = alpacaData;
        source = alpacaData.source || 'Alpaca';
        isDelayed = alpacaData.isDelayed || false;
        name = alpacaData.name;
        type = alpacaData.type;
        exchange = alpacaData.exchange;
      } else {
        console.log(`[StockDataService] Alpaca insufficient data for ${symbol}`);
      }
    } catch (alpacaError) {
      console.error(`[StockDataService] Alpaca error for ${symbol}:`, alpacaError.message);
    }
  }

  // 3. Try Yahoo Finance if Alpaca failed
  if (!snapshotDetails) {
    console.log(`[StockDataService] Alpaca failed for ${symbol}, trying Yahoo Finance...`);
    try {
      const yahooData = await getYahooFinanceSnapshot(symbol);
      
      if (yahooData && yahooData.latestTrade?.p) {
        console.log(`[StockDataService] Yahoo Finance success for ${symbol}:`, yahooData);
        snapshotDetails = yahooData;
        source = yahooData.source || 'Yahoo Finance';
        isDelayed = yahooData.isDelayed !== undefined ? yahooData.isDelayed : true;
        name = yahooData.name;
        type = yahooData.type;
        exchange = yahooData.exchange;
      } else {
        console.log(`[StockDataService] Yahoo Finance insufficient data for ${symbol}`);
      }
    } catch (yahooError) {
      console.error(`[StockDataService] Yahoo Finance error for ${symbol}:`, yahooError.message);
    }
  }

  // 4. Try Alpha Vantage as final fallback
  if (!snapshotDetails) {
    console.log(`[StockDataService] Yahoo Finance failed for ${symbol}, trying Alpha Vantage...`);
    try {
      const alphaVantageData = await fetchAlphaVantageStockData(symbol);
      
      if (alphaVantageData && alphaVantageData.price) {
        console.log(`[StockDataService] Alpha Vantage success for ${symbol}:`, alphaVantageData);
        snapshotDetails = {
          latestTrade: { p: alphaVantageData.price },
          dailyBar: {
            c: alphaVantageData.price,
            h: alphaVantageData.high,
            l: alphaVantageData.low,
            v: alphaVantageData.volume,
          },
          prevDailyBar: { c: alphaVantageData.previousClose },
        };
        source = alphaVantageData.source || 'Alpha Vantage';
        isDelayed = alphaVantageData.isDelayed || true;
        name = alphaVantageData.name || name;
      } else {
        console.log(`[StockDataService] Alpha Vantage insufficient data for ${symbol}`);
      }
    } catch (alphaVantageError) {
      console.error(`[StockDataService] Alpha Vantage error for ${symbol}:`, alphaVantageError.message);
    }
  }

  // 5. Handle symbol with dot (e.g., BRK.A -> BRKA)
  if (!snapshotDetails && symbol.includes(".")) {
    console.log(`[StockDataService] No data for ${symbol}, trying without '.' character`);
    const symbolWithoutDot = symbol.replace(".", "");
    // Recursive call with modified symbol
    return fetchSnapshotWithFallback(symbolWithoutDot, isCrypto);
  }

  if (!snapshotDetails) {
    console.log(`[StockDataService] No snapshot data found for ${symbol} after all fallbacks`);
    return null;
  }

  // Consolidate and return
  const result = {
    ...snapshotDetails,
    source: source,
    isDelayed: isDelayed,
    name: name || snapshotDetails.name,
    type: type || snapshotDetails.type,
    exchange: exchange || snapshotDetails.exchange
  };

  console.log(`[StockDataService] Final result for ${symbol}:`, {
    source: result.source,
    price: result.latestTrade?.p,
    name: result.name,
    isDelayed: result.isDelayed
  });

  return result;
}

/**
 * Legacy Yahoo Finance fetch function for backward compatibility
 * @param {string} symbol - The stock symbol
 * @returns {Promise<object|null>} - Yahoo Finance data
 */
export async function fetchYahooData(symbol) {
  try {
    const response = await fetch(
      `https://yfapi.net/v6/finance/quote?region=US&lang=en&symbols=${symbol}`,
      {
        headers: {
          accept: "application/json",
          "X-API-KEY": YH_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result.length > 0) {
      const quote = data.quoteResponse.result[0];
      
      return {
        [symbol]: {
          latestTrade: { p: quote.regularMarketPrice },
          dailyBar: {
            o: quote.regularMarketOpen,
            h: quote.regularMarketDayHigh,
            l: quote.regularMarketDayLow,
            c: quote.regularMarketPrice,
            v: quote.regularMarketVolume,
          },
          prevDailyBar: { c: quote.regularMarketPreviousClose },
          source: 'Yahoo Finance',
          isDelayed: true,
          name: quote.longName || quote.shortName,
          type: quote.quoteType,
          exchange: quote.fullExchangeName,
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error("[fetchYahooData] Yahoo API Error:", error);
    return null;
  }
}
