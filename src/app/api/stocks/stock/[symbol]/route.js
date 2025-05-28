import { NextResponse } from "next/server";
import connectToDatabase from "@/app/utils/db";
import Stock from "@/app/models/Stock";
import { fetchAlphaVantageNews, fetchAlphaVantageStockData, getAlphaVantageHistoricalDaily } from "@/app/utils/alphaVantage"; // Added getAlphaVantageHistoricalDaily
import { getPolygonSnapshot, fetchPolygonNews, fetchPolygonHistoricalData } from "@/app/utils/polygon"; // Import Polygon utility
import { getYahooFinanceHistoricalData, getYahooFinanceNews } from "@/app/utils/yahooFinance"; // Import Yahoo Finance utils

const POLYGON_API_KEY = process.env.POLYGON_KEY;
const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const YH_KEY = process.env.YH_KEY;

const stockDataCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(req, { params }) {
  try {
    await connectToDatabase();

    // Extract the symbol from the request parameters
    const uncodedSymbol = await params;
    const symbol = decodeURIComponent(uncodedSymbol.symbol);

    if (!symbol) {
      return NextResponse.json(
        { success: false, message: "Symbol is required." },
        { status: 400 }
      );
    }

    if (stockDataCache.has(symbol)) {
      const cachedEntry = stockDataCache.get(symbol);
      if (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        return NextResponse.json(cachedEntry.data);
      }
    }

    // Add new function for Yahoo Finance API
    const fetchYahooData = async (symbol) => {
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
          throw new Error(`Yahoo API Error: ${response.status}`);
        }

        const data = await response.json();
        const result = data.quoteResponse?.result?.[0];

        if (!result) {
          return null;
        }

        // Return data in consistent format matching Alpaca
        return {
          [symbol]: {
            latestTrade: {
              p: result.regularMarketPrice,
            },
            dailyBar: {
              c: result.regularMarketPrice,
              h: result.regularMarketDayHigh,
              l: result.regularMarketDayLow,
              v: result.regularMarketVolume,
              vw: result.regularMarketPrice, // VWAP not available
            },
            prevDailyBar: {
              c: result.regularMarketPreviousClose,
            },
            source: 'Yahoo Finance', // Add source
            isDelayed: true // Yahoo data can be delayed
          },
        };
      } catch (error) {
        console.error("Yahoo API Error:", error);
        return null;
      }
    };

    const fetchSnapshot = async (symbol, isCrypto = false) => {
      let snapshotDetails = null;
      let source = 'N/A';
      let isDelayed = false;
      let name = null;
      let type = null;
      let exchange = null;

      // Try Polygon.io first
      try {
        console.log(`Trying Polygon.io for ${symbol}...`);
        const polygonData = await getPolygonSnapshot(symbol); // This function is in /utils/polygon.js
        if (polygonData && polygonData.price !== null && polygonData.price !== undefined) {
            console.log(`Found ${symbol} in Polygon.io:`, polygonData);
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
        } else if (polygonData === null) {
          // getPolygonSnapshot explicitly returned null (e.g. 403 or other error handled inside it)
          console.log(`getPolygonSnapshot returned null for ${symbol}, proceeding to fallbacks.`);
        }
      } catch (polygonError) {
        // This catch is if getPolygonSnapshot itself throws an unhandled error
        console.error(`Error calling getPolygonSnapshot for ${symbol}:`, polygonError.message);
        // Ensure snapshotDetails remains null to trigger fallbacks
      }

      // Try Alpaca second, if Polygon failed or didn't provide data
      if (!snapshotDetails) {
        console.log(`Polygon.io failed or no data for ${symbol}, trying Alpaca...`);
        source = 'Alpaca'; // Default to Alpaca if we attempt it
        isDelayed = false;  // Alpaca real-time for subscribers
        try {
          if (!isCrypto) {
            const alpacaResponse = await fetch(
              `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbol}`,
              {
                headers: {
                  "APCA-API-KEY-ID": ALPACA_API_KEY,
                  "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
                },
              }
            );

            if (alpacaResponse.ok) {
              const alpacaData = await alpacaResponse.json();
              if (alpacaData[symbol]) {
                snapshotDetails = alpacaData[symbol]; // Alpaca snapshot structure
                console.log(`Found ${symbol} in Alpaca:`, snapshotDetails);
                // name, type, exchange might not be directly in alpacaData[symbol] in this format
                // these will be enriched later by fetchAssetDetails if needed
              }
            } else {
              console.warn(`Alpaca API error for ${symbol}: ${alpacaResponse.status}`);
            }
          }
          // Add similar logic for Alpaca crypto if needed, or assume it's handled by general crypto logic
        } catch (alpacaError) {
          console.error(`Error fetching from Alpaca for ${symbol}:`, alpacaError.message);
        }
      }

      // If no Alpaca data, try Yahoo
      if (!snapshotDetails) {
        console.log(`Alpaca failed or no data for ${symbol}, trying Yahoo Finance...`);
        try {
          const yahooData = await fetchYahooData(symbol); // fetchYahooData is defined above
          if (yahooData && yahooData[symbol]) {
            console.log(`Found ${symbol} in Yahoo:`, yahooData[symbol]);
            snapshotDetails = yahooData[symbol]; // Already includes source and isDelayed
            source = snapshotDetails.source;
            isDelayed = snapshotDetails.isDelayed;
            // name, type, exchange might not be directly in yahooData[symbol]
          }
        } catch (yahooError) {
          console.error(`Error fetching from Yahoo for ${symbol}:`, yahooError.message);
        }
      }

      // If still no data (Alpaca/Yahoo failed), try Alpha Vantage
      if (!snapshotDetails) {
        console.log(`Yahoo failed or no data for ${symbol}, trying Alpha Vantage...`);
        try {
          const alphaVantageData = await fetchAlphaVantageStockData(symbol); // from /utils/alphaVantage.js
          if (alphaVantageData) {
            console.log(`Found ${symbol} in Alpha Vantage:`, alphaVantageData);
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
            name = alphaVantageData.name || name; // Prioritize AV name if available
          }
        } catch (alphaVantageError) {
          console.error(`Error fetching from Alpha Vantage for ${symbol}:`, alphaVantageError.message);
        }
      }

      // If still no data and symbol has dot, try without dot (recursive call)
      // This recursive call should be careful to avoid infinite loops if symbol transformation is complex
      if (!snapshotDetails && symbol.includes(".")) {
        console.log(`No data for ${symbol}, trying recursive call without '.'`);
        const symbolWithoutDot = symbol.replace(".", "");
        // Return the result of the recursive call directly
        // The recursive call will handle its own source, isDelayed, name, type, exchange
        return fetchSnapshot(symbolWithoutDot, isCrypto); 
      }

      if (!snapshotDetails) {
        console.log(`No snapshot data found for ${symbol} in any API after all fallbacks.`);
        return null; // Explicitly return null if no data found
      }
      
      // Consolidate and return
      return { 
        ...snapshotDetails, 
        source: source, 
        isDelayed: isDelayed,
        name: name || snapshotDetails.name, // Ensure name is carried through
        type: type || snapshotDetails.type, // Ensure type is carried through
        exchange: exchange || snapshotDetails.exchange // Ensure exchange is carried through
      };
    };

    const fetchHistoricalData = async (symbol, isCrypto = false) => {
      let historicalData = [];
      let source = 'N/A';
      const to = new Date(); // Use current date for 'to'
      // For 'from', let's aim for roughly 1 year of data, but Yahoo takes 'daysToFetch'
      const daysToFetchForChart = 365; 

      // 1. Try Polygon.io
      try {
        console.log(`[Chart Data] Attempting Polygon.io for ${symbol}`);
        const fromPolygon = new Date(new Date().setFullYear(to.getFullYear() - 1)).toISOString().split('T')[0];
        const toPolygon = to.toISOString().split('T')[0];
        const polygonHistorical = await fetchPolygonHistoricalData(symbol, fromPolygon, toPolygon, 'day', 1);

        if (polygonHistorical && polygonHistorical.length > 0) {
            console.log(`[Chart Data] Polygon.io success for ${symbol}: ${polygonHistorical.length} points.`);
            historicalData = polygonHistorical;
            source = 'Polygon.io';
            // Polygon data is already in {t, o, h, l, c, v, vw, n} format.
            // We need to ensure it's mapped to {t, c} if that's what the chart component expects,
            // or adapt the chart component. For now, let's assume the detailed chart can handle OHLCV.
            // The `fetchPolygonHistoricalData` already maps to a common structure.
            return { data: historicalData, error: null, source: source };
        } else {
            console.warn(`[Chart Data] Polygon.io for ${symbol} returned no data or failed.`);
        }
      } catch (error) {
        console.error(`[Chart Data] Polygon.io error for ${symbol}:`, error.message);
      }

      // 2. Try Yahoo Finance (especially for international or if Polygon fails)
      if (historicalData.length === 0) {
        console.log(`[Chart Data] Attempting Yahoo Finance for ${symbol}`);
        try {
          // getYahooFinanceHistoricalData returns {t, c}
          const yahooHistorical = await getYahooFinanceHistoricalData(symbol, daysToFetchForChart);
          if (yahooHistorical && yahooHistorical.length > 0) {
            console.log(`[Chart Data] Yahoo Finance success for ${symbol}: ${yahooHistorical.length} points.`);
            // This data is {t, c}. If the chart needs OHLCV, this won't be sufficient alone.
            // For now, we'll return it as is. The chart component might need to adapt or
            // we might need to decide if {t,c} is acceptable for the detailed chart.
            historicalData = yahooHistorical;
            source = 'Yahoo Finance';
            return { data: historicalData, error: null, source: source };
          } else {
            console.warn(`[Chart Data] Yahoo Finance for ${symbol} returned no data.`);
          }
        } catch (error) {
          console.error(`[Chart Data] Yahoo Finance error for ${symbol}:`, error.message);
        }
      }

      // 3. Fallback to Alpaca (primarily for US stocks if others fail)
      if (historicalData.length === 0 && !isCrypto) { // Alpaca typically for non-crypto
        console.log(`[Chart Data] Attempting Alpaca for ${symbol}`);
        try {
          const fromAlpaca = new Date(new Date().setFullYear(to.getFullYear() - 1)).toISOString();
          const url = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbol}&timeframe=1Day&start=${fromAlpaca}`;
          const response = await fetch(url, {
            headers: {
              "APCA-API-KEY-ID": ALPACA_API_KEY,
              "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
            },
          });

          if (!response.ok) {
            console.warn(`[Chart Data] Alpaca API error for ${symbol}: ${response.status} ${response.statusText}`);
          } else {
            const alpacaJson = await response.json();
            if (alpacaJson.bars && alpacaJson.bars[symbol] && alpacaJson.bars[symbol].length > 0) {
              console.log(`[Chart Data] Alpaca success for ${symbol}: ${alpacaJson.bars[symbol].length} points.`);
              historicalData = alpacaJson.bars[symbol]; // Alpaca data is {t, o, h, l, c, v, n, vw}
              source = 'Alpaca';
              return { data: historicalData, error: null, source: source };
            } else if (symbol.includes(".")) { // Try removing dot for Alpaca if it failed
                const symbolWithoutDot = symbol.replace(".", "");
                console.log(`[Chart Data] Alpaca failed for ${symbol}, trying ${symbolWithoutDot}`);
                const urlRetry = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbolWithoutDot}&timeframe=1Day&start=${fromAlpaca}`;
                const responseRetry = await fetch(urlRetry, { /* headers */ });
                if(responseRetry.ok){
                    const alpacaJsonRetry = await responseRetry.json();
                     if (alpacaJsonRetry.bars && alpacaJsonRetry.bars[symbolWithoutDot] && alpacaJsonRetry.bars[symbolWithoutDot].length > 0) {
                        console.log(`[Chart Data] Alpaca success for ${symbolWithoutDot}: ${alpacaJsonRetry.bars[symbolWithoutDot].length} points.`);
                        historicalData = alpacaJsonRetry.bars[symbolWithoutDot];
                        source = 'Alpaca';
                        return { data: historicalData, error: null, source: source };
                    }
                }
            }
             if (historicalData.length === 0) { // if still no data after potential retry
                console.warn(`[Chart Data] Alpaca for ${symbol} (and potential retry) returned no data.`);
            }
          }
        } catch (error) {
          console.error(`[Chart Data] Alpaca error for ${symbol}:`, error.message);
        }
      }
      
      // 4. Fallback to Alpha Vantage
      if (historicalData.length === 0) {
        console.log(`[Chart Data] Attempting Alpha Vantage for ${symbol}`);
        try {
          // getAlphaVantageHistoricalDaily returns {t, c}
          const avHistorical = await getAlphaVantageHistoricalDaily(symbol, daysToFetchForChart, 'full'); // 'full' for more data
          if (avHistorical && avHistorical.length > 0) {
            console.log(`[Chart Data] Alpha Vantage success for ${symbol}: ${avHistorical.length} points.`);
            historicalData = avHistorical;
            source = 'Alpha Vantage';
            return { data: historicalData, error: null, source: source };
          } else {
            console.warn(`[Chart Data] Alpha Vantage for ${symbol} returned no data.`);
          }
        } catch (error) {
          console.error(`[Chart Data] Alpha Vantage error for ${symbol}:`, error.message);
        }
      }

      // If all attempts fail or result in no data
      if (historicalData.length === 0) {
        console.error(`[Chart Data] All providers failed to fetch historical data for ${symbol}.`);
        return { error: `No historical data found for ${symbol} from any provider.`, data: [], source: 'Error' };
      }
      
      // This part should ideally not be reached if one of the return statements above is hit.
      // If it is, it means historicalData was populated but not returned, which is a logic flaw.
      // However, to be safe, if historicalData has content, return it.
      return { data: historicalData, error: null, source: source };
    };

    const fetchAssetDetails = async (symbol) => {
      let dbAsset = await Stock.findOne({ symbol }).exec();

      if (dbAsset) {
        return {
          name: dbAsset.name,
          type: dbAsset.type || null,
        };
      }

      if (!dbAsset && symbol.includes(".")) {
        const hyphenSymbol = symbol.replace(".", "");
        dbAsset = await Stock.findOne({ symbol: hyphenSymbol }).exec();
        if (dbAsset) {
          return {
            name: dbAsset.name,
            type: dbAsset.type || null,
          };
        }
      }

      if (!dbAsset && symbol.includes("/")) {
        const cryptoSymbol = symbol.replace("/", "");
        dbAsset = await Stock.findOne({ symbol: cryptoSymbol }).exec();
        if (dbAsset) {
          return {
            name: dbAsset.name,
            type: dbAsset.type || null,
          };
        }
      }

      return { name: null, type: null };
    };
    const fetchDividendYield = async (symbol, currentPrice) => {
      try {
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        const dividendResponse = await fetch(
          `https://api.polygon.io/v3/reference/dividends?ticker=${symbol}&limit=10&apiKey=${POLYGON_API_KEY}`
        );
        if (!dividendResponse.ok) {
          throw new Error(
            `Failed to fetch dividend data: ${dividendResponse.statusText}`
          );
        }
        const dividendData = await dividendResponse.json();

        if (symbol.includes(".") && !dividendData.results) {
          const hyphenSymbol = symbol.replace(".", "");
          return fetchDividendYield(hyphenSymbol, currentPrice);
        }

        const annualDividendAmountLastYear = dividendData.results.reduce(
          (acc, dividend) => {
            const dividendYear = new Date(
              dividend.declaration_date
            ).getFullYear();
            return dividendYear === lastYear ? acc + dividend.cash_amount : acc;
          },
          0
        );

        let annualDividendAmount = annualDividendAmountLastYear;
        if (annualDividendAmountLastYear === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          const dividendResponseThisYear = await fetch(
            `https://api.polygon.io/v3/reference/dividends?ticker=${symbol}&limit=10&apiKey=${POLYGON_API_KEY}`
          );
          if (!dividendResponseThisYear.ok) {
            throw new Error(
              `Failed to fetch dividend data for this year: ${dividendResponseThisYear.statusText}`
            );
          }
          const dividendDataThisYear = await dividendResponseThisYear.json();

          if (symbol.includes(".") && !dividendDataThisYear.results) {
            const hyphenSymbol = symbol.replace(".", "");
            return fetchDividendYield(hyphenSymbol, currentPrice);
          }

          annualDividendAmount = dividendDataThisYear.results.reduce(
            (acc, dividend) => {
              const dividendDate = new Date(dividend.declaration_date);
              if (dividendDate <= yesterday) {
                return acc + dividend.cash_amount;
              }
              return acc;
            },
            0
          );
        }

        // If no dividends were paid, return 0 dividend yield
        if (annualDividendAmount === 0 || !currentPrice) {
          return {
            annualDividendAmount: 0,
            closePrice: currentPrice || 0,
            dividendYield: 0,
          };
        }

        // Calculate dividend yield using current price
        const dividendYield = (annualDividendAmount / currentPrice) * 100;

        return {
          annualDividendAmount,
          closePrice: currentPrice,
          dividendYield,
        };
      } catch (error) {
        console.error("Error fetching dividend yield:", error);
        return {
          error: error.message,
          data: null,
        };
      }
    };

    const fetchFundamentalMetrics = async (symbol) => {
      try {
        const url = `https://api.polygon.io/vX/reference/financials?ticker=${symbol}&limit=10&apiKey=${POLYGON_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(
            `Failed to fetch fundamentals: ${response.statusText}`
          );
        const data = await response.json();

        if (symbol.includes(".") && data.results.length === 0) {
          return fetchFundamentalMetrics(symbol.replace(".", ""));
        }

        if (!data.results) {
          throw new Error("No fundamental data found");
        }

        return (
          data.results?.map((result) => ({
            // Meta Info
            period: {
              fiscalYear: result.fiscal_year,
              fiscalPeriod: result.fiscal_period,
              startDate: result.start_date,
              endDate: result.end_date,
              filingDate: result.filing_date,
              sourceUrl: result.source_filing_url,
            },
            // Statements
            income: result.financials.income_statement,
            cashFlow: result.financials.cash_flow_statement,
            balance: result.financials.balance_sheet,
            comprehensive: result.financials.comprehensive_income,
            companyInfo: {
              name: result.company_name,
              tickers: result.tickers,
            },
          })) || []
        );
      } catch (error) {
        console.error("Error fetching fundamentals:", error);
        return [];
      }
    };

    const fetchNews = async (symbol) => {
      let fetchedNews = [];
      let source = "N/A";

      // 1. Try Polygon.io first
      try {
        console.log(`[News] Attempting Polygon.io for ${symbol}`);
        const polygonNews = await fetchPolygonNews(symbol);
        if (polygonNews && polygonNews.length > 0) {
          console.log(`[News] Polygon.io success for ${symbol}: ${polygonNews.length} articles.`);
          // Ensure Polygon news items have a 'published_at' field, or adapt as needed.
          // The fetchPolygonNews function should ideally standardize this.
          return polygonNews.map(n => ({ ...n, source: n.source || 'Polygon.io' })); 
        }
        console.warn(`[News] Polygon.io for ${symbol} returned no news.`);
      } catch (error) {
        console.error(`[News] Polygon.io error for ${symbol}:`, error.message);
      }

      // 2. Try Yahoo Finance News (especially for international or if Polygon fails)
      if (fetchedNews.length === 0) {
        console.log(`[News] Attempting Yahoo Finance for ${symbol}`);
        try {
          const yahooNews = await getYahooFinanceNews(symbol, 10); // Fetch 10 articles
          if (yahooNews && yahooNews.length > 0) {
            console.log(`[News] Yahoo Finance success for ${symbol}: ${yahooNews.length} articles.`);
            // Yahoo Finance news is already formatted with 'published_at' and 'source'
            return yahooNews; 
          }
          console.warn(`[News] Yahoo Finance for ${symbol} returned no news.`);
        } catch (error) {
          console.error(`[News] Yahoo Finance error for ${symbol}:`, error.message);
        }
      }

      // 3. Try Alpaca (primarily for US stocks if others fail)
      // Alpaca news might be less relevant for international stocks but can be a fallback.
      if (fetchedNews.length === 0) {
        console.log(`[News] Attempting Alpaca for ${symbol}`);
        try {
          const url = `https://data.alpaca.markets/v1beta1/news?symbols=${symbol}&limit=10`;
          const response = await fetch(url, {
            headers: {
              "APCA-API-KEY-ID": ALPACA_API_KEY,
              "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
            },
          });

          if (response.ok) {
            const alpacaJson = await response.json();
            if (alpacaJson.news && alpacaJson.news.length > 0) {
              console.log(`[News] Alpaca success for ${symbol}: ${alpacaJson.news.length} articles.`);
              // Adapt Alpaca news structure if necessary, especially 'published_at' and 'source'
              // The existing code maps 'Headline' to 'title', 'URL' to 'url', etc.
              // Ensure 'published_at' is correctly mapped from 'CreatedAt' or similar.
              // And add a source field.
              fetchedNews = alpacaJson.news.map(article => ({
                title: article.headline,
                url: article.url,
                source: article.source || 'Alpaca',
                summary: article.summary || '',
                image: article.images && article.images.length > 0 ? article.images[0].url : null,
                published_at: article.created_at || article.updated_at, // Prefer created_at
                symbols: article.symbols || [symbol],
              }));
              return fetchedNews;
            }
          }
          console.warn(`[News] Alpaca for ${symbol} returned no news or failed: ${response.statusText}`);
        } catch (error) {
          console.error(`[News] Alpaca error for ${symbol}:`, error.message);
        }
      }
      
      // 4. Fallback to Alpha Vantage
      if (fetchedNews.length === 0) {
        console.log(`[News] Attempting Alpha Vantage for ${symbol}`);
        try {
          const alphaVantageNews = await fetchAlphaVantageNews(symbol); // fetchAlphaVantageNews should handle formatting
          if (alphaVantageNews && alphaVantageNews.length > 0) {
            console.log(`[News] Alpha Vantage success for ${symbol}: ${alphaVantageNews.length} articles.`);
            // Ensure Alpha Vantage news items have 'published_at' and 'source'.
            // The fetchAlphaVantageNews function should ideally standardize this.
            return alphaVantageNews.map(n => ({ ...n, source: n.source || 'Alpha Vantage' }));
          }
          console.warn(`[News] Alpha Vantage for ${symbol} returned no news.`);
        } catch (error) {
          console.error(`[News] Alpha Vantage error for ${symbol}:`, error.message);
        }
      }

      if (fetchedNews.length === 0) {
        console.log(`[News] No news found for ${symbol} from any provider.`);
      }
      return fetchedNews; // Return whatever was fetched, or empty array
    };

    // Determine if the symbol is for a stock or crypto
    const isCrypto = symbol.includes("/");
    const snapshot = await fetchSnapshot(symbol, isCrypto);

    if (!snapshot) {
      return NextResponse.json(
        { success: false, message: "Asset not found." },
        { status: 404 }
      );
    }

    // const snapshotData = await fetchSnapshot(symbol, isCrypto); // Already fetched as snapshot

    // if (!snapshotData) { // Redundant check
    //   return NextResponse.json(
    //     { success: false, message: "Asset not found." },
    //     { status: 404 }
    //   );
    // }
    
    const snapshotDataToUse = snapshot; // This line should use the result of fetchSnapshot

    // Ensure historicalData is an object with a 'data' array and 'source'
    let historicalDataResult = await fetchHistoricalData(symbol, isCrypto);
    if (!historicalDataResult || typeof historicalDataResult !== 'object' || !Array.isArray(historicalDataResult.data)) {
        console.warn(`Historical data for ${symbol} was invalid, setting to empty. Received:`, historicalDataResult);
        historicalDataResult = { data: [], error: historicalDataResult?.error || "Invalid data structure", source: historicalDataResult?.source || 'Unknown' };
    }
    
    const newsData = await fetchNews(symbol);
    const assetDetails = await fetchAssetDetails(symbol);

    // Fetch fundamental metrics
    const fundamentalMetrics = await fetchFundamentalMetrics(symbol); // Uncommented and fetched

    // Fetch dividend yield data
    // We need the current price for dividend yield calculation, use snapshot's price
    const currentPriceForDividendCalc = snapshotDataToUse.latestTrade?.p;
    const dividendYieldData = await fetchDividendYield(symbol, currentPriceForDividendCalc);


    // Determine the final name, type, and exchangeShortName
    // Priority: Snapshot data (if it has it, e.g. from Polygon), then assetDetails from DB
    const finalName = snapshotDataToUse.name || assetDetails.name || symbol;
    const finalType = snapshotDataToUse.type || assetDetails.type || (isCrypto ? "Crypto" : "Stock/ETF");
    const finalExchange = snapshotDataToUse.exchange || snapshotDataToUse.latestTrade?.x || snapshotDataToUse.exchangeShortName || "N/A";

    // Prepare the response object
    const responseData = {
      success: true,
      data: {
        symbol: symbol,
        name: finalName,
        exchangeShortName: finalExchange,
        type: finalType,
        price: snapshotDataToUse.latestTrade?.p || null,
        change: snapshotDataToUse.dailyBar?.c && snapshotDataToUse.prevDailyBar?.c 
                ? snapshotDataToUse.dailyBar.c - snapshotDataToUse.prevDailyBar.c 
                : null,
        changePercent: snapshotDataToUse.dailyBar?.c && snapshotDataToUse.prevDailyBar?.c && snapshotDataToUse.prevDailyBar.c !== 0
                       ? ((snapshotDataToUse.dailyBar.c - snapshotDataToUse.prevDailyBar.c) / snapshotDataToUse.prevDailyBar.c) * 100
                       : (snapshotDataToUse.todaysChangePerc ?? null), // Fallback to todaysChangePerc if available
        high: snapshotDataToUse.dailyBar?.h || null,
        low: snapshotDataToUse.dailyBar?.l || null,
        open: snapshotDataToUse.dailyBar?.o || null,
        previousClose: snapshotDataToUse.prevDailyBar?.c || null,
        volume: snapshotDataToUse.dailyBar?.v || null,
        vwap: snapshotDataToUse.dailyBar?.vw || null, // VWAP might not be available from all sources
        historicalData: historicalDataResult.data,
        historicalDataSource: historicalDataResult.source, // Added
        news: Array.isArray(newsData) ? newsData : [], // Ensure news is always an array
        
        // Integrate fundamental and dividend data
        fundamentals: {
          // Assuming fetchFundamentalMetrics returns an array, we might want the latest.
          // For now, let's pass the first item if available, or an empty object.
          // The structure of fundamentalMetrics needs to be known to map correctly.
          // Based on fetchFundamentalMetrics, it returns an array of objects with:
          // income, cashFlow, balance, comprehensive, companyInfo, period
          // Let's assume we take the most recent (first in the array if sorted desc by date)
          latestFinancials: fundamentalMetrics && fundamentalMetrics.length > 0 ? fundamentalMetrics[0] : {},
          // Extract specific common metrics if available directly from Polygon's Ticker Details or similar
          // For example, market cap, P/E, EPS are often part of "ticker details" or "quote" endpoints in some APIs.
          // Polygon's /vX/reference/financials gives raw statement data.
          // We might need to calculate P/E, EPS, etc., or rely on Polygon providing them elsewhere.
          // For now, KeyMetrics.js expects specific fields like market_capitalization, price_earnings_ratio.
          // Let's see what `fetchFundamentalMetrics` actually provides.
          // The `fetchFundamentalMetrics` in the provided code returns an array of financials.
          // The `KeyMetrics.js` component expects `metrics.fundamentals?.market_capitalization?.value`
          // This implies the API should structure it like that.
          // Let's adjust based on what Polygon /vX/reference/financials actually returns.
          // Typically, you'd get market_cap, P/E, EPS from a different endpoint or calculate them.
          // For now, we'll pass what we have and adjust KeyMetrics.js or this API later.
          rawFinancials: fundamentalMetrics, // Pass the whole array for now
        },
        dividendInfo: dividendYieldData && !dividendYieldData.error ? {
            yield: dividendYieldData.dividendYield, // e.g., 2.5 for 2.5%
            annualAmount: dividendYieldData.annualDividendAmount,
            // Add other dividend details if needed
        } : { yield: null, annualAmount: null },

        // secFilings: filings, // Placeholder for SEC filings
        source: snapshotDataToUse.source || 'N/A', // Source of the snapshot data
        isDelayed: snapshotDataToUse.isDelayed || false, // Whether the snapshot data is delayed
      },
    };

    // After fetching and processing all data into responseData
    const currentDataToCache = { success: true, data: responseData };
    stockDataCache.set(symbol, {
      data: currentDataToCache,
      timestamp: Date.now(),
    });

    return NextResponse.json(currentDataToCache);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
