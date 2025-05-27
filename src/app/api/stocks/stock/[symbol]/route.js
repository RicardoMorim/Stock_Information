import { NextResponse } from "next/server";
import connectToDatabase from "@/app/utils/db";
import Stock from "@/app/models/Stock";

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
          },
        };
      } catch (error) {
        console.error("Yahoo API Error:", error);
        return null;
      }
    };

    const fetchSnapshot = async (symbol, isCrypto = false) => {
      try {
        // Try Alpaca first
        let snapshotData = null;

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
            snapshotData = alpacaData[symbol];
          }
        }

        // If no Alpaca data, try Yahoo
        if (!snapshotData) {
          console.log(`Trying Yahoo Finance for ${symbol}...`);
          const yahooData = await fetchYahooData(symbol);
          if (yahooData && yahooData[symbol]) {
            console.log(`Found ${symbol} in Yahoo:`, yahooData[symbol]);
            // Fix: Extract the data directly instead of nesting it again
            snapshotData = yahooData[symbol];
          }
        }

        // If still no data and symbol has dot, try without dot
        if (!snapshotData && symbol.includes(".")) {
          const symbolWithoutDot = symbol.replace(".", "");
          return fetchSnapshot(symbolWithoutDot, isCrypto);
        }

        if (!snapshotData) {
          console.log(`No data found for ${symbol} in either API`);
          return null;
        }

        // Return the data directly without additional nesting
        return snapshotData;
      } catch (error) {
        console.error("Snapshot fetch error:", error);
        return null;
      }
    };

    const fetchHistoricalData = async (symbol, isCrypto = false) => {
      try {
        let baseUrl;
        if (isCrypto) {
          baseUrl = "https://data.alpaca.markets/v1beta3/crypto/us/bars";
        } else {
          baseUrl = "https://data.alpaca.markets/v2/stocks/bars";
        }

        const url = `${baseUrl}?symbols=${symbol}&timeframe=1Day&start=${new Date(
          new Date().setFullYear(new Date().getFullYear() - 1)
        ).toISOString()}`;

        const response = await fetch(url, {
          headers: {
            "APCA-API-KEY-ID": ALPACA_API_KEY,
            "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
          },
        });

        if (!response.ok) {
          return {
            error: `API Error: ${response.status} ${response.statusText}`,
            data: [],
          };
        }

        const data = await response.json();

        if (symbol.includes(".") && !data.bars[symbol]) {
          const hyphenSymbol = symbol.replace(".", "");
          return fetchHistoricalData(hyphenSymbol, isCrypto);
        }

        return { data: data.bars[symbol] || [], error: null };
      } catch (error) {
        console.error("Error fetching historical data:", error);
        return { error: error.message, data: [] };
      }
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
      try {
        const url = `https://data.alpaca.markets/v1beta1/news?symbols=${symbol}&limit=10`;

        const response = await fetch(url, {
          headers: {
            "APCA-API-KEY-ID": ALPACA_API_KEY,
            "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch news: ${response.statusText}`);
        }

        if (symbol.includes(".") && !response.news) {
          return fetchNews(symbol.replace(".", ""));
        }

        const newsData = await response.json();
        return newsData.news;
      } catch (error) {
        console.error("Error fetching news:", error);
        return [];
      }
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

    const snapshotData = await fetchSnapshot(symbol, isCrypto);

    if (!snapshotData) {
      return NextResponse.json(
        { success: false, message: "Asset not found." },
        { status: 404 }
      );
    }

    // Fetch additional data
    const [historicalDataResult, assetDetails, newsData, fundamentals] =
      await Promise.all([
        fetchHistoricalData(symbol, isCrypto),
        fetchAssetDetails(symbol),
        fetchNews(symbol),
        fetchFundamentalMetrics(symbol),
      ]);

    const currentPrice = snapshotData.latestTrade?.p || 0;
    const prevClose = snapshotData.prevDailyBar?.c || 0;
    const changePercent = prevClose
      ? ((currentPrice - prevClose) / prevClose) * 100
      : 0;

    const responseData = {
      symbol,
      name: assetDetails.name || symbol,
      type: assetDetails.type || "stock",
      price: currentPrice,
      changePercent,
      high: snapshotData.dailyBar?.h || currentPrice,
      low: snapshotData.dailyBar?.l || currentPrice,
      volume: snapshotData.dailyBar?.v || 0,
      vwap: snapshotData.dailyBar?.vw || currentPrice,
      historicalData: {
        data: historicalDataResult.data || [],
        error: historicalDataResult.error || null,
      },
      news: newsData || [],
      fundamentals: fundamentals || [],
      // Add data availability flags
      dataAvailability: {
        price: Boolean(currentPrice),
        historical: Boolean(historicalDataResult?.data?.length),
        news: Boolean(newsData?.length),
        fundamentals: Boolean(fundamentals?.length),
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
