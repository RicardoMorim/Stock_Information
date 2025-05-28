import { NextResponse } from "next/server";
import {polygonClient, fetchPolygonRecentHistoricalData, getPolygonSnapshot } from "@/app/utils/polygon";
import alpaca, { getAlpacaHistoricalBars, getAlpacaSnapshots } from "@/app/utils/alpaca";
import { getAlphaVantageHistoricalDaily } from "@/app/utils/alphaVantage"; // Added Alpha Vantage import

// In-memory cache
let mainStocksCache = {
  data: null,
  lastFetched: 0,
};

let searchableListCache = {
  data: null,
  lastFetched: 0,
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Define main tickers: stocks/ETFs and crypto
const MAIN_STOCK_ETF_TICKERS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "TSLA",
  "AMZN",
  "NVDA",
  "SPY",
  "QQQ",
  "DIA",
  "IWM",
];
const MAIN_CRYPTO_TICKERS = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "DOGE/USD",
  "ADA/USD",
]; // Alpaca uses / for crypto pairs

async function fetchMainStocksData() {
  const now = Date.now();
  if (
    mainStocksCache.data &&
    now - mainStocksCache.lastFetched < CACHE_DURATION
  ) {
    console.log("Serving main stocks data from cache.");
    return mainStocksCache.data;
  }
  console.log("Fetching main stocks data. Checking MAIN_STOCK_ETF_TICKERS and MAIN_CRYPTO_TICKERS...");
  console.log("MAIN_STOCK_ETF_TICKERS:", MAIN_STOCK_ETF_TICKERS);
  console.log("Is MAIN_STOCK_ETF_TICKERS an array?", Array.isArray(MAIN_STOCK_ETF_TICKERS));
  console.log("MAIN_CRYPTO_TICKERS:", MAIN_CRYPTO_TICKERS);
  console.log("Is MAIN_CRYPTO_TICKERS an array?", Array.isArray(MAIN_CRYPTO_TICKERS));

  try {
    let fetchedMainStocks = [];

    // Fetch stock/ETF data
    if (MAIN_STOCK_ETF_TICKERS.length > 0) {
      console.log("Attempting to fetch stock/ETF snapshots using custom getAlpacaSnapshots for symbols:", MAIN_STOCK_ETF_TICKERS);
      const stockSnapshotsObject = await getAlpacaSnapshots(MAIN_STOCK_ETF_TICKERS, false); // Use OUR utility function
      console.log("Raw stockSnapshotsObject from custom getAlpacaSnapshots:", JSON.stringify(stockSnapshotsObject, null, 2));

      if (!stockSnapshotsObject) {
        console.error("Custom getAlpacaSnapshots for stocks/ETFs returned null or undefined.");
      } else if (Object.keys(stockSnapshotsObject).length === 0) {
        console.warn("Custom getAlpacaSnapshots for stocks/ETFs returned an empty object. No snapshots found for symbols:", MAIN_STOCK_ETF_TICKERS);
      }

      if (stockSnapshotsObject && Object.keys(stockSnapshotsObject).length > 0) {
        const stockDataPromises = MAIN_STOCK_ETF_TICKERS.map(async (symbol) => {
          const snapshot = stockSnapshotsObject[symbol];
          console.log(`Processing stock/ETF: ${symbol}, Snapshot:`, JSON.stringify(snapshot, null, 2));

          if (snapshot) {
            const latestPrice = snapshot.latestTrade?.p || snapshot.latestQuote?.ap || null;
            const dailyChange = snapshot.dailyChange; 
            let changePercent = null;

            if (dailyChange !== undefined && dailyChange !== null) {
              changePercent = dailyChange * 100;
            } else {
              console.warn(`Could not determine changePercent for ${symbol} from snapshot.dailyChange. latestPrice: ${latestPrice}`);
            }

            let miniChartData = await fetchPolygonRecentHistoricalData(symbol, 7);
            if (!miniChartData || miniChartData.length === 0) {
              console.warn(`Polygon mini-chart data fetch failed for ${symbol}. Attempting Alpaca fallback.`);
              miniChartData = await getAlpacaHistoricalBars(symbol, 7, false); 
              if (!miniChartData || miniChartData.length === 0) {
                console.warn(`Alpaca mini-chart data fetch also failed for ${symbol}. Attempting Alpha Vantage fallback.`);
                miniChartData = await getAlphaVantageHistoricalDaily(symbol, 7);
                if (!miniChartData || miniChartData.length === 0) {
                    console.error(`Alpha Vantage mini-chart data fetch also failed for ${symbol}.`);
                } else {
                    console.log(`Successfully fetched mini-chart data from Alpha Vantage for ${symbol}`);
                }
              } else {
                console.log(`Successfully fetched mini-chart data from Alpaca for ${symbol}`);
              }
            }

            return {
              symbol: symbol,
              name: symbol, 
              price: latestPrice,
              changePercent: changePercent,
              exchangeShortName: snapshot.latestTrade?.x || snapshot.latestQuote?.x || "N/A",
              type: "Stock/ETF",
              source: "Alpaca", 
              isDelayed: false, 
              miniChartData: miniChartData, 
            };
          } else {
            console.warn(`No snapshot data found in stockSnapshotsObject for symbol: ${symbol}`);
            return null; 
          }
        });
        const resolvedStockData = (await Promise.all(stockDataPromises)).filter(item => item !== null);
        fetchedMainStocks.push(...resolvedStockData);
      } else {
        console.log("No stock/ETF snapshots to process from stockSnapshotsObject.");
      }
    } else {
      console.log("No MAIN_STOCK_ETF_TICKERS to fetch.");
    }

    // Fetch crypto data
    if (MAIN_CRYPTO_TICKERS.length > 0) {
      console.log("Attempting to fetch crypto snapshots using custom getAlpacaSnapshots for symbols:", MAIN_CRYPTO_TICKERS);
      const cryptoSnapshots = await getAlpacaSnapshots(MAIN_CRYPTO_TICKERS, true); // Use OUR utility function
      console.log("Raw cryptoSnapshots from custom getAlpacaSnapshots:", JSON.stringify(cryptoSnapshots, null, 2));

      if (!cryptoSnapshots) {
        console.error("Custom getAlpacaSnapshots returned null or undefined.");
      } else if (Object.keys(cryptoSnapshots).length === 0) {
        console.warn("Custom getAlpacaSnapshots returned an empty object. No crypto snapshots found for symbols:", MAIN_CRYPTO_TICKERS);
      }
      
      const cryptoDataPromises = MAIN_CRYPTO_TICKERS.map(async (originalSymbol) => {
        console.log(`Processing crypto: ${originalSymbol}`);
        // The key in cryptoSnapshots from our utility should be the originalSymbol itself (e.g., "BTC/USD")
        const snapshot = cryptoSnapshots ? cryptoSnapshots[originalSymbol] : null; 
        console.log(`Snapshot for ${originalSymbol}:`, JSON.stringify(snapshot, null, 2));

        if (snapshot) {
          console.log(`Snapshot found for ${originalSymbol}. Fetching mini chart...`);
          const polygonSymbol = originalSymbol.includes('/') ? `X:${originalSymbol.replace('/','')}` : originalSymbol;
          
          let miniChartData = await fetchPolygonRecentHistoricalData(polygonSymbol, 7);
          if (!miniChartData || miniChartData.length === 0) {
            console.warn(`Polygon mini-chart data fetch failed for ${polygonSymbol} (original: ${originalSymbol}). Attempting Alpaca fallback.`);
            miniChartData = await getAlpacaHistoricalBars(originalSymbol, 7, true);
            if (!miniChartData || miniChartData.length === 0) {
              console.warn(`Alpaca mini-chart data fetch also failed for ${originalSymbol}. Attempting Alpha Vantage fallback.`);
              // Alpha Vantage typically doesn't use "BTC/USD" but just "BTC" and might need a market context for crypto, 
              // or might not support all crypto pairs directly for TIME_SERIES_DAILY.
              // For simplicity, we'll try with the base symbol part if it's a crypto pair.
              const avSymbol = originalSymbol.includes('/') ? originalSymbol.split('/')[0] : originalSymbol;
              miniChartData = await getAlphaVantageHistoricalDaily(avSymbol, 7);
              if (!miniChartData || miniChartData.length === 0) {
                console.error(`Alpha Vantage mini-chart data fetch also failed for ${originalSymbol} (tried ${avSymbol}).`);
              } else {
                console.log(`Successfully fetched mini-chart data from Alpha Vantage for ${originalSymbol} (using ${avSymbol})`);
              }
            } else {
              console.log(`Successfully fetched mini-chart data from Alpaca for ${originalSymbol}`);
            }
          } else {
            // console.log(`Successfully fetched mini-chart data from Polygon for ${polygonSymbol}`);
          }

          return {
            symbol: originalSymbol,
            name: originalSymbol, 
            price: snapshot.latestTrade?.p || snapshot.latestQuote?.ap || null, // Check both trade and quote
            changePercent: snapshot.dailyChange !== undefined && snapshot.dailyChange !== null ? snapshot.dailyChange * 100 : null,
            exchangeShortName: snapshot.latestTrade?.x || snapshot.latestQuote?.x || "CRYPTO",
            type: "Crypto",
            source: "Alpaca", 
            isDelayed: false, 
            miniChartData: miniChartData, 
          };
        } else {
          console.warn(`No snapshot data found in cryptoSnapshots object for crypto symbol: ${originalSymbol}`);
          return null; 
        }
      });
      const resolvedCryptoData = (await Promise.all(cryptoDataPromises)).filter(item => item !== null);
      console.log("Resolved crypto data (after filtering nulls):", JSON.stringify(resolvedCryptoData, null, 2));
      fetchedMainStocks.push(...resolvedCryptoData);

    } else {
      console.log("No MAIN_CRYPTO_TICKERS to fetch.");
    }

    console.log("Total fetchedMainStocks count:", fetchedMainStocks.length);
    if(fetchedMainStocks.length > 0) {
      console.log("First item in fetchedMainStocks:", JSON.stringify(fetchedMainStocks[0], null, 2));
    }
    mainStocksCache = { data: fetchedMainStocks, lastFetched: now };
    return fetchedMainStocks;
  } catch (error) {
    console.error(
      "Error in fetchMainStocksData function with Alpaca:",
      error.message,
      "Stack trace:", error.stack,
      "Alpaca error response:", error.response?.data
    );
    if (mainStocksCache.data) {
      console.warn("Serving stale main stocks data due to fetch error.");
      return mainStocksCache.data;
    }
    throw new Error(`Failed to fetch main stocks data. Original error: ${error.message}`);
  }
}

async function fetchSearchableList() {
  const now = Date.now();
  if (
    searchableListCache.data &&
    now - searchableListCache.lastFetched < CACHE_DURATION
  ) {
    console.log("Serving searchable list from cache.");
    return searchableListCache.data;
  }
  console.log("Fetching searchable list from Alpaca API.");

  try {
    // Fetch active US equities and crypto assets
    const stockAssets = await alpaca.getAssets({
      status: "active",
      asset_class: "us_equity",
    });
    const cryptoAssets = await alpaca.getAssets({
      status: "active",
      asset_class: "crypto",
    });

    const combinedAssets = [...stockAssets, ...cryptoAssets];
    const formattedAssets = combinedAssets.map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      // You could add more details here if needed by StockCard when displaying search results
      // e.g., type: asset.asset_class === 'crypto' ? 'Crypto' : (asset.tradable ? 'Stock/ETF' : 'Other')
    }));

    searchableListCache = { data: formattedAssets, lastFetched: now };
    return formattedAssets;
  } catch (error) {
    console.error(
      "Error fetching searchable list from Alpaca:",
      error.message || error.toString()
    );
    if (searchableListCache.data) {
      console.warn("Serving stale searchable list due to fetch error.");
      return searchableListCache.data;
    }
    throw new Error("Failed to fetch searchable asset list.");
  }
}

export async function GET(request) {
  try {
    const mainStocksPromise = fetchMainStocksData();
    const searchableListPromise = fetchSearchableList();

    // Await both promises concurrently
    const [mainStocksData, searchableList] = await Promise.all([
      mainStocksPromise,
      searchableListPromise,
    ]);

    // Enrich mainStocksData with names from searchableList for better display
    const enrichedMainStocksData = mainStocksData.map((mainStock) => {
      const assetInfo = searchableList.find(
        (s) => s.symbol === mainStock.symbol
      );
      return {
        ...mainStock,
        name: assetInfo?.name || mainStock.name, // Use name from searchableList if available
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        mainStocksData: enrichedMainStocksData,
        searchableList: searchableList,
      },
    });
  } catch (error) {
    console.error("[API/STOCKS] Error:", error.message || error.toString());
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
