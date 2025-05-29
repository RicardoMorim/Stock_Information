
import { fetchPolygonHistoricalData } from "@/app/utils/polygon";
import { getYahooFinanceHistoricalData } from "@/app/utils/yahooFinance";
import { getAlphaVantageHistoricalDaily } from "@/app/utils/alphaVantage";

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;

/**
 * Fetches historical chart data with fallback mechanism
 * Tries: Polygon -> Yahoo Finance -> Alpaca -> Alpha Vantage
 * @param {string} symbol - The stock symbol to fetch
 * @param {boolean} isCrypto - Whether the symbol is a cryptocurrency
 * @returns {Promise<object>} - Historical data with source info
 */
export async function fetchHistoricalDataWithFallback(symbol, isCrypto = false) {
  let historicalData = [];
  let source = 'N/A';
  const to = new Date();
  const daysToFetchForChart = 365;

  console.log(`[HistoricalDataService] Starting fallback mechanism for ${symbol} chart data`);

  // 1. Try Polygon.io first
  try {
    console.log(`[HistoricalDataService] Trying Polygon for ${symbol}`);
    const from = new Date(new Date().setFullYear(to.getFullYear() - 1)).toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    
    const polygonHistorical = await fetchPolygonHistoricalData(symbol, from, toStr, 'day', 1);
    
    if (polygonHistorical && polygonHistorical.length > 0) {
      console.log(`[HistoricalDataService] Polygon success for ${symbol}: ${polygonHistorical.length} data points`);
      historicalData = polygonHistorical;
      source = 'Polygon.io';
    } else {
      console.log(`[HistoricalDataService] Polygon returned no data for ${symbol}`);
    }
  } catch (error) {
    console.error(`[HistoricalDataService] Polygon error for ${symbol}:`, error.message);
  }

  // 2. Try Yahoo Finance if Polygon failed
  if (historicalData.length === 0) {
    console.log(`[HistoricalDataService] Trying Yahoo Finance for ${symbol}`);
    try {
      const yahooHistorical = await getYahooFinanceHistoricalData(symbol, daysToFetchForChart);
      
      if (yahooHistorical && yahooHistorical.length > 0) {
        console.log(`[HistoricalDataService] Yahoo Finance success for ${symbol}: ${yahooHistorical.length} data points`);
        historicalData = yahooHistorical;
        source = 'Yahoo Finance';
      } else {
        console.log(`[HistoricalDataService] Yahoo Finance returned no data for ${symbol}`);
      }
    } catch (error) {
      console.error(`[HistoricalDataService] Yahoo Finance error for ${symbol}:`, error.message);
    }
  }

  // 3. Try Alpaca if Yahoo failed (primarily for US stocks)
  if (historicalData.length === 0 && !isCrypto) {
    console.log(`[HistoricalDataService] Trying Alpaca for ${symbol}`);
    try {
      const fromAlpaca = new Date(new Date().setFullYear(to.getFullYear() - 1)).toISOString();
      const url = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbol}&timeframe=1Day&start=${fromAlpaca}`;
      
      const response = await fetch(url, {
        headers: {
          "APCA-API-KEY-ID": ALPACA_API_KEY,
          "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
        },
      });

      if (response.ok) {
        const alpacaJson = await response.json();
        
        if (alpacaJson.bars && alpacaJson.bars[symbol] && alpacaJson.bars[symbol].length > 0) {
          console.log(`[HistoricalDataService] Alpaca success for ${symbol}: ${alpacaJson.bars[symbol].length} data points`);
          
          historicalData = alpacaJson.bars[symbol].map(bar => ({
            t: new Date(bar.t).getTime(),
            c: bar.c,
            o: bar.o,
            h: bar.h,
            l: bar.l,
            v: bar.v,
            source: 'Alpaca',
            isDelayed: false,
          }));
          source = 'Alpaca';
        } else {
          console.log(`[HistoricalDataService] Alpaca returned no bars for ${symbol}`);
          
          // Retry with symbol without dot for stocks like BRK.A
          if (symbol.includes(".")) {
            const symbolWithoutDot = symbol.replace(".", "");
            console.log(`[HistoricalDataService] Retrying Alpaca with ${symbolWithoutDot}`);
            
            const retryUrl = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbolWithoutDot}&timeframe=1Day&start=${fromAlpaca}`;
            const retryResponse = await fetch(retryUrl, {
              headers: {
                "APCA-API-KEY-ID": ALPACA_API_KEY,
                "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
              },
            });

            if (retryResponse.ok) {
              const retryJson = await retryResponse.json();
              if (retryJson.bars && retryJson.bars[symbolWithoutDot] && retryJson.bars[symbolWithoutDot].length > 0) {
                console.log(`[HistoricalDataService] Alpaca retry success for ${symbolWithoutDot}: ${retryJson.bars[symbolWithoutDot].length} data points`);
                
                historicalData = retryJson.bars[symbolWithoutDot].map(bar => ({
                  t: new Date(bar.t).getTime(),
                  c: bar.c,
                  o: bar.o,
                  h: bar.h,
                  l: bar.l,
                  v: bar.v,
                  source: 'Alpaca',
                  isDelayed: false,
                }));
                source = 'Alpaca';
              }
            }
          }
        }
      } else {
        console.warn(`[HistoricalDataService] Alpaca API error for ${symbol}: ${response.status}`);
      }
    } catch (error) {
      console.error(`[HistoricalDataService] Alpaca error for ${symbol}:`, error.message);
    }
  }

  // 4. Try Alpha Vantage as final fallback
  if (historicalData.length === 0) {
    console.log(`[HistoricalDataService] Trying Alpha Vantage for ${symbol}`);
    try {
      const avHistorical = await getAlphaVantageHistoricalDaily(symbol, daysToFetchForChart, 'full');
      
      if (avHistorical && avHistorical.length > 0) {
        console.log(`[HistoricalDataService] Alpha Vantage success for ${symbol}: ${avHistorical.length} data points`);
        historicalData = avHistorical;
        source = 'Alpha Vantage';
      } else {
        console.log(`[HistoricalDataService] Alpha Vantage returned no data for ${symbol}`);
      }
    } catch (error) {
      console.error(`[HistoricalDataService] Alpha Vantage error for ${symbol}:`, error.message);
    }
  }

  const result = {
    data: historicalData,
    error: historicalData.length === 0 ? 'No historical data found from any provider' : null,
    source: source
  };

  console.log(`[HistoricalDataService] Final result for ${symbol}:`, {
    source: result.source,
    dataPoints: result.data.length,
    hasError: !!result.error
  });

  return result;
}
