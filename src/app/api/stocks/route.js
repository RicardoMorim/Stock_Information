import { NextResponse } from "next/server";
import {
  fetchPolygonRecentHistoricalData,
} from "@/app/utils/polygon";
import  {
  getAlpacaHistoricalBars,
  getAlpacaSnapshots,
} from "@/app/utils/alpaca";
import {
  getAlphaVantageHistoricalDaily,
  getAlphaVantageDigitalCurrencyDaily,
} from "@/app/utils/alphaVantage";
import { getYahooFinanceHistoricalData } from "@/app/utils/yahooFinance";

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
];

let cryptoDetails = {};

async function fetchMainStocksData() {
  const now = Date.now();
  if (
    mainStocksCache.data &&
    now - mainStocksCache.lastFetched < CACHE_DURATION
  ) {
    console.log("Serving main stocks data from cache.");
    return mainStocksCache.data;
  }
  console.log(
    "Fetching main stocks data. Checking MAIN_STOCK_ETF_TICKERS and MAIN_CRYPTO_TICKERS..."
  );
  console.log("MAIN_STOCK_ETF_TICKERS:", MAIN_STOCK_ETF_TICKERS);
  console.log(
    "Is MAIN_STOCK_ETF_TICKERS an array?",
    Array.isArray(MAIN_STOCK_ETF_TICKERS)
  );
  console.log("MAIN_CRYPTO_TICKERS:", MAIN_CRYPTO_TICKERS);
  console.log(
    "Is MAIN_CRYPTO_TICKERS an array?",
    Array.isArray(MAIN_CRYPTO_TICKERS)
  );

  try {
    let fetchedMainStocks = [];

    // Fetch stock/ETF data
    if (MAIN_STOCK_ETF_TICKERS && MAIN_STOCK_ETF_TICKERS.length > 0) {
      console.log(
        "Attempting to fetch stock/ETF snapshots using custom getAlpacaSnapshots for symbols:",
        MAIN_STOCK_ETF_TICKERS
      );
      const stockSnapshotsObject = await getAlpacaSnapshots(
        MAIN_STOCK_ETF_TICKERS,
        false
      );
      console.log(
        "Raw stockSnapshotsObject from custom getAlpacaSnapshots:",
        JSON.stringify(stockSnapshotsObject, null, 2)
      );

      if (!stockSnapshotsObject) {
        console.error(
          "Custom getAlpacaSnapshots for stocks/ETFs returned null or undefined."
        );
      } else if (Object.keys(stockSnapshotsObject).length === 0) {
        console.warn(
          "Custom getAlpacaSnapshots for stocks/ETFs returned an empty object. No snapshots found for symbols:",
          MAIN_STOCK_ETF_TICKERS
        );
      }

      if (
        stockSnapshotsObject &&
        Object.keys(stockSnapshotsObject).length > 0
      ) {
        const stockDataPromises = MAIN_STOCK_ETF_TICKERS.map(async (symbol) => {
          const snapshot = stockSnapshotsObject[symbol];
          console.log(
            `Processing stock/ETF: ${symbol}, Snapshot:`,
            JSON.stringify(snapshot, null, 2)
          );

          if (snapshot) {
            const latestPrice =
              snapshot.latestTrade?.p || snapshot.latestQuote?.ap || null;
            const dailyChange = snapshot.dailyChange;
            let changePercent = null;

            if (dailyChange !== undefined && dailyChange !== null) {
              changePercent = dailyChange * 100;
            } else {
              console.warn(
                `Could not determine changePercent for ${symbol} from snapshot.dailyChange. latestPrice: ${latestPrice}`
              );
            }

            let miniChartData = null;
            const DAYS_TO_FETCH_STOCK = 7;
            const MIN_POINTS_STOCK = 3;

            // 1. Try Alpaca for stocks
            console.log(`[Stock MiniChart] Attempting Alpaca for ${symbol}`);
            let alpacaStockData = await getAlpacaHistoricalBars(
              symbol,
              DAYS_TO_FETCH_STOCK,
              false
            );
            let alpacaPoints = alpacaStockData ? alpacaStockData.length : 0;

            if (alpacaStockData && alpacaPoints >= MIN_POINTS_STOCK) {
              miniChartData = alpacaStockData;
              console.log(
                `[Stock MiniChart] Alpaca success for ${symbol}: ${miniChartData.length} points.`
              );
            } else {
              console.warn(
                `[Stock MiniChart] Alpaca for ${symbol} gave ${alpacaPoints} points (less than ${MIN_POINTS_STOCK}). Trying Polygon.`
              );

              // 2. Try Polygon for stocks
              let polygonStockData = await fetchPolygonRecentHistoricalData(
                symbol,
                DAYS_TO_FETCH_STOCK
              );
              let polygonPoints = polygonStockData
                ? polygonStockData.length
                : 0;

              if (polygonStockData && polygonPoints >= MIN_POINTS_STOCK) {
                miniChartData = polygonStockData;
                console.log(
                  `[Stock MiniChart] Polygon success for ${symbol}: ${miniChartData.length} points.`
                );
              } else {
                console.warn(
                  `[Stock MiniChart] Polygon for ${symbol} gave ${polygonPoints} points (less than ${MIN_POINTS_STOCK}). Trying Alpha Vantage.`
                );

                // 3. Try Alpha Vantage for stocks
                let avStockData = await getAlphaVantageHistoricalDaily(
                  symbol,
                  DAYS_TO_FETCH_STOCK
                );
                let avPoints = avStockData ? avStockData.length : 0;

                if (avStockData && avPoints >= MIN_POINTS_STOCK) {
                  miniChartData = avStockData;
                  console.log(
                    `[Stock MiniChart] Alpha Vantage success for ${symbol}: ${miniChartData.length} points.`
                  );
                } else {
                  console.warn(
                    `[Stock MiniChart] Alpha Vantage for ${symbol} gave ${avPoints} points. Trying Yahoo Finance.`
                  );

                  // 4. Try Yahoo Finance for stocks
                  let yahooStockData = await getYahooFinanceHistoricalData(
                    symbol,
                    DAYS_TO_FETCH_STOCK
                  );
                  let yahooPoints = yahooStockData ? yahooStockData.length : 0;

                  if (yahooStockData && yahooPoints >= MIN_POINTS_STOCK) {
                    miniChartData = yahooStockData;
                    console.log(
                      `[Stock MiniChart] Yahoo Finance success for ${symbol}: ${miniChartData.length} points.`
                    );
                  } else {
                    console.warn(
                      `[Stock MiniChart] Yahoo Finance for ${symbol} gave ${yahooPoints} points. Using best available for ${symbol}.`
                    );
                    // Select the best of the four, even if less than MIN_POINTS_STOCK
                    if (
                      alpacaPoints >= polygonPoints &&
                      alpacaPoints >= avPoints &&
                      alpacaPoints >= yahooPoints &&
                      alpacaPoints > 0
                    ) {
                      miniChartData = alpacaStockData;
                    } else if (
                      polygonPoints > alpacaPoints &&
                      polygonPoints >= avPoints &&
                      polygonPoints >= yahooPoints &&
                      polygonPoints > 0
                    ) {
                      miniChartData = polygonStockData;
                    } else if (
                      avPoints > alpacaPoints &&
                      avPoints > polygonPoints &&
                      avPoints >= yahooPoints &&
                      avPoints > 0
                    ) {
                      miniChartData = avStockData;
                    } else if (yahooPoints > 0) {
                      miniChartData = yahooStockData;
                    } else {
                      miniChartData =
                        alpacaStockData && alpacaPoints > 0
                          ? alpacaStockData
                          : polygonStockData && polygonPoints > 0
                          ? polygonStockData
                          : avStockData && avPoints > 0
                          ? avStockData
                          : []; // Default to best available or empty
                    }

                    if (miniChartData && miniChartData.length > 0) {
                      console.log(
                        `[Stock MiniChart] Best available for ${symbol} (from fallbacks) has ${miniChartData.length} points.`
                      );
                    } else {
                      console.log(
                        `[Stock MiniChart] No chart data found for ${symbol} after all fallbacks.`
                      );
                      miniChartData = [];
                    }
                  }
                }
              }
            }
            if (!miniChartData) miniChartData = []; // Final safety net

            // Calculate changePercent from miniChartData if not available from snapshot
            if (
              (changePercent === null ||
                typeof changePercent !== "number" ||
                isNaN(changePercent)) &&
              miniChartData &&
              miniChartData.length >= 2
            ) {
              const currentClose = miniChartData[miniChartData.length - 1].c;
              const previousClose = miniChartData[miniChartData.length - 2].c;
              if (
                typeof currentClose === "number" &&
                typeof previousClose === "number" &&
                previousClose !== 0
              ) {
                changePercent =
                  ((currentClose - previousClose) / previousClose) * 100;
                console.log(
                  `[Stock MiniChart] Calculated changePercent for ${symbol}: ${changePercent.toFixed(
                    2
                  )}% from miniChartData.`
                );
              } else {
                console.warn(
                  `[Stock MiniChart] Could not calculate changePercent for ${symbol} from miniChartData due to invalid close prices or previousClose being zero.`
                );
              }
            }

            return {
              symbol: symbol,
              name: symbol,
              price: latestPrice,
              changePercent: changePercent,
              exchangeShortName:
                snapshot.latestTrade?.x || snapshot.latestQuote?.x || "N/A",
              type: "Stock/ETF",
              source: "Alpaca",
              isDelayed: false,
              miniChartData: miniChartData,
            };
          } else {
            console.warn(
              `No snapshot data found in stockSnapshotsObject for symbol: ${symbol}`
            );
            return null;
          }
        });
        const resolvedStockData = (await Promise.all(stockDataPromises)).filter(
          (item) => item !== null
        );
        fetchedMainStocks.push(...resolvedStockData);
      } else {
        console.log(
          "No stock/ETF snapshots to process from stockSnapshotsObject."
        );
      }
    } else {
      console.log("No MAIN_STOCK_ETF_TICKERS to fetch.");
    }

    // Fetch crypto data
    if (MAIN_CRYPTO_TICKERS && MAIN_CRYPTO_TICKERS.length > 0) {
      console.log(
        "Attempting to fetch crypto snapshots using custom getAlpacaSnapshots for symbols:",
        MAIN_CRYPTO_TICKERS
      );
      const cryptoSnapshots = await getAlpacaSnapshots(
        MAIN_CRYPTO_TICKERS,
        true
      );
      console.log(
        "Raw cryptoSnapshots from custom getAlpacaSnapshots:",
        JSON.stringify(cryptoSnapshots, null, 2)
      );

      if (!cryptoSnapshots) {
        console.error(
          "Custom getAlpacaSnapshots returned null or undefined for crypto."
        );
      } else if (Object.keys(cryptoSnapshots).length === 0) {
        console.warn(
          "Custom getAlpacaSnapshots returned an empty object for crypto. No crypto snapshots found for symbols:",
          MAIN_CRYPTO_TICKERS
        );
      }

      const cryptoDataPromises = MAIN_CRYPTO_TICKERS.map(
        async (originalSymbol) => {
          console.log(`Processing crypto: ${originalSymbol}`);
          const snapshot = cryptoSnapshots
            ? cryptoSnapshots[originalSymbol]
            : null;
          console.log(
            `Snapshot for ${originalSymbol}:`,
            JSON.stringify(snapshot, null, 2)
          );

          if (snapshot) {
            console.log(`Processing crypto for main page: ${originalSymbol}`);
            const polygonSymbol = originalSymbol.includes("/")
              ? `X:${originalSymbol.replace("/", "")}`
              : originalSymbol;
            const alphaVantageCryptoSymbol = originalSymbol.split("/")[0]; 

            let miniChartData = null;
            const DAYS_TO_FETCH_CRYPTO = 7;
            const MIN_POINTS_CRYPTO = 3; // Prefer at least 3 points

            // 1. Try Polygon for Crypto
            console.log(
              `[Crypto MiniChart] Attempting Polygon for ${originalSymbol} (using ${polygonSymbol})`
            );
            let polygonCryptoData = await fetchPolygonRecentHistoricalData(
              polygonSymbol,
              DAYS_TO_FETCH_CRYPTO
            );
            let polygonPoints = polygonCryptoData
              ? polygonCryptoData.length
              : 0;

            if (polygonCryptoData && polygonPoints >= MIN_POINTS_CRYPTO) {
              miniChartData = polygonCryptoData;
              console.log(
                `[Crypto MiniChart] Polygon success for ${originalSymbol}: ${miniChartData.length} points.`
              );
            } else {
              console.warn(
                `[Crypto MiniChart] Polygon for ${originalSymbol} gave ${polygonPoints} points (less than ${MIN_POINTS_CRYPTO}). Trying Alpaca.`
              );

              // 2. Try Alpaca for Crypto
              let alpacaCryptoData = await getAlpacaHistoricalBars(
                originalSymbol,
                DAYS_TO_FETCH_CRYPTO,
                true
              );
              let alpacaPoints = alpacaCryptoData ? alpacaCryptoData.length : 0;

              if (alpacaCryptoData && alpacaPoints >= MIN_POINTS_CRYPTO) {
                miniChartData = alpacaCryptoData;
                console.log(
                  `[Crypto MiniChart] Alpaca success for ${originalSymbol}: ${miniChartData.length} points.`
                );
              } else {
                console.warn(
                  `[Crypto MiniChart] Alpaca for ${originalSymbol} gave ${alpacaPoints} points (less than ${MIN_POINTS_CRYPTO}). Trying Alpha Vantage.`
                );

                // 3. Try Alpha Vantage for Crypto
                let avCryptoData = await getAlphaVantageDigitalCurrencyDaily(
                  alphaVantageCryptoSymbol,
                  DAYS_TO_FETCH_CRYPTO
                );
                let avPoints = avCryptoData ? avCryptoData.length : 0;

                if (avCryptoData && avPoints >= MIN_POINTS_CRYPTO) {
                  miniChartData = avCryptoData;
                  console.log(
                    `[Crypto MiniChart] Alpha Vantage success for ${originalSymbol}: ${miniChartData.length} points.`
                  );
                } else {
                  console.warn(
                    `[Crypto MiniChart] Alpha Vantage for ${originalSymbol} gave ${avPoints} points. Using best available for ${originalSymbol}.`
                  );

                  if (
                    polygonPoints >= alpacaPoints &&
                    polygonPoints >= avPoints &&
                    polygonPoints > 0
                  ) {
                    miniChartData = polygonCryptoData;
                  } else if (
                    alpacaPoints > polygonPoints &&
                    alpacaPoints >= avPoints &&
                    alpacaPoints > 0
                  ) {
                    // check alpaca only if it's strictly better than polygon
                    miniChartData = alpacaCryptoData;
                  } else if (avPoints > 0) {
                    // Check AV if it has any points and others were worse or zero
                    miniChartData = avCryptoData;
                  } else {
                    miniChartData =
                      polygonCryptoData && polygonPoints > 0
                        ? polygonCryptoData
                        : alpacaCryptoData && alpacaPoints > 0
                        ? alpacaCryptoData
                        : []; // Default to polygon if it had data, else alpaca, else empty
                  }

                  if (miniChartData && miniChartData.length > 0) {
                    console.log(
                      `[Crypto MiniChart] Best available for ${originalSymbol} (from fallbacks) has ${miniChartData.length} points.`
                    );
                  } else {
                    console.log(
                      `[Crypto MiniChart] No chart data found for ${originalSymbol} after all fallbacks.`
                    );
                    miniChartData = [];
                  }
                }
              }
            }
            if (!miniChartData) miniChartData = []; // Final safety net

            // Safely access cryptoDetails
            const nameFromDetails = cryptoDetails[originalSymbol]?.name;

            return {
              symbol: originalSymbol,
              name: nameFromDetails || originalSymbol, // Use fetched name if available, otherwise default to symbol
              price:
                snapshot.latestTrade?.p || snapshot.latestQuote?.ap || null,
              changePercent:
                snapshot.dailyBar &&
                snapshot.prevDailyBar &&
                typeof snapshot.dailyBar.c === "number" &&
                typeof snapshot.prevDailyBar.c === "number" &&
                snapshot.prevDailyBar.c !== 0
                  ? ((snapshot.dailyBar.c - snapshot.prevDailyBar.c) /
                      snapshot.prevDailyBar.c) *
                    100
                  : snapshot.dailyChange !== undefined &&
                    snapshot.dailyChange !== null
                  ? snapshot.dailyChange * 100
                  : null,
              exchangeShortName:
                snapshot.latestTrade?.x || snapshot.latestQuote?.x || "CRYPTO",
              type: "Crypto",
              source: "Alpaca",
              isDelayed: false,
              miniChartData:
                miniChartData && miniChartData.length > 0 ? miniChartData : [],
            };
          } else {
            console.warn(
              `No snapshot data found in cryptoSnapshots object for crypto symbol: ${originalSymbol}`
            );
            return null;
          }
        }
      );

      const resolvedCryptoData = (await Promise.all(cryptoDataPromises)).filter(
        (item) => item !== null
      );
      fetchedMainStocks.push(...resolvedCryptoData);
      console.log(
        "Resolved crypto data (after filtering nulls):",
        JSON.stringify(resolvedCryptoData, null, 2)
      );
    } else {
      console.log("No MAIN_CRYPTO_TICKERS to fetch.");
    }

    mainStocksCache.data = fetchedMainStocks;
    mainStocksCache.lastFetched = now;
    console.log("Total fetchedMainStocks count:", fetchedMainStocks.length);
    if (fetchedMainStocks.length > 0) {
      console.log(
        "First item in fetchedMainStocks:",
        JSON.stringify(fetchedMainStocks[0], null, 2)
      );
    }
    return fetchedMainStocks;
  } catch (error) {
    console.error(
      "Error in fetchMainStocksData function:",
      error.message,
      "Stack trace:",
      error.stack
    );
    // More specific error logging for the API response
    throw new Error(
      `Failed to fetch main stocks data. Original error: ${error.message}`
    );
  }
}

async function fetchSearchableList() {
  const now = Date.now();
  if (
    searchableListCache.data &&
    now - searchableListCache.lastFetched < CACHE_DURATION
  ) {
    console.log("[SearchableList] Serving searchable list from cache.");
    return searchableListCache.data;
  }
  console.log(
    "[SearchableList] Fetching searchable list from internal /api/stocks/allStocks endpoint."
  );

  try {
  
    const internalApiUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; 
    const response = await fetch(`${internalApiUrl}/api/stocks/allStocks`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        "[SearchableList] Error fetching from /api/stocks/allStocks:",
        response.status,
        errorData.message
      );
      throw new Error(
        `Failed to fetch from /api/stocks/allStocks: ${
          errorData.message || response.statusText
        }`
      );
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      console.error(
        "[SearchableList] /api/stocks/allStocks did not return successful data array:",
        result
      );
      throw new Error("Invalid data format from /api/stocks/allStocks");
    }

    const formattedAssets = result.data.map((asset) => ({
      symbol: asset.symbol, 
      name: asset.name, 
      exchangeShortName: asset.exchangeShortName,
      type: asset.type,
      country: asset.country,
      marketIdentifier: asset.marketIdentifier,
    }));

    console.log(
      `[SearchableList] Fetched ${formattedAssets.length} assets from MongoDB.`
    );
    if (formattedAssets.length > 0) {
      console.log(
        "[SearchableList] Sample of first 5 assets from MongoDB:",
        formattedAssets.slice(0, 5)
      );
    }

    searchableListCache = { data: formattedAssets, lastFetched: now };
    return formattedAssets;
  } catch (error) {
    console.error(
      "[SearchableList] Error in fetchSearchableList function:",
      error.message || error.toString()
    );
    // Fallback to stale cache if available on error
    if (searchableListCache.data) {
      console.warn(
        "[SearchableList] Serving stale searchable list due to fetch error."
      );
      return searchableListCache.data;
    }

    throw new Error(`Failed to fetch searchable asset list: ${error.message}`);
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
        name: assetInfo?.name || mainStock.name, 
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
