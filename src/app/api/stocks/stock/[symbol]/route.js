import { NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

// Import service modules
import { fetchSnapshotWithFallback } from "@/app/services/stockDataService";
import { fetchHistoricalDataWithFallback } from "@/app/services/historicalDataService";
import { fetchNewsWithFallback } from "@/app/services/newsService";
import { fetchAllFinancialMetrics } from "@/app/services/fundamentalsService";
import { getAssetDetails } from "@/app/services/assetService";

// Initialize Upstash Redis client
const redis = Redis.fromEnv();

// Cache duration: 15 minutes
const CACHE_DURATION_SECONDS = 15 * 60;

export async function GET(req, { params }) {
  try {
    console.log(`[StockAPI] Starting request processing`);

    // Extract the symbol from the request parameters
    const uncodedSymbol = await params;
    const symbol = decodeURIComponent(uncodedSymbol.symbol);

    if (!symbol) {
      return NextResponse.json(
        { success: false, message: "Symbol is required." },
        { status: 400 }
      );
    }

    console.log(`[StockAPI] Processing symbol: ${symbol}`);

    // Check Redis cache first
    const cacheKey = `stock_${symbol}`;
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`[StockAPI] Returning cached data from Redis for ${symbol}`);
        return NextResponse.json({data: cachedData});
      }
    } catch (error) {
      console.error(`[StockAPI] Error reading from Redis cache for ${symbol}:`, error);
      // Continue without cache if Redis fails
    }

    // Determine if the symbol is for a stock or crypto
    const isCrypto = symbol.includes("/") || symbol.includes("-");
    console.log(`[StockAPI] Symbol ${symbol} identified as ${isCrypto ? 'crypto' : 'stock'}`);

    // Fetch snapshot data with fallback mechanism
    const snapshot = await fetchSnapshotWithFallback(symbol, isCrypto);
    
    if (!snapshot) {
      console.log(`[StockAPI] No snapshot data found for ${symbol}`);
      return NextResponse.json(
        { success: false, message: "Asset not found." },
        { status: 404 }
      );
    }

    // Fetch all data in parallel for better performance
    console.log(`[StockAPI] Fetching all data for ${symbol} in parallel`);
    const [historicalDataResult, newsData, assetDetails, financialMetrics] = await Promise.all([
      fetchHistoricalDataWithFallback(symbol, isCrypto),
      fetchNewsWithFallback(symbol),
      getAssetDetails(symbol, snapshot),
      fetchAllFinancialMetrics(symbol, snapshot.latestTrade?.p)
    ]);

    // Validate historical data structure
    if (!historicalDataResult || typeof historicalDataResult !== 'object' || !Array.isArray(historicalDataResult.data)) {
      console.warn(`[StockAPI] Historical data for ${symbol} was invalid, setting to empty. Received:`, historicalDataResult);
      historicalDataResult.data = [];
      historicalDataResult.error = historicalDataResult?.error || "Invalid data structure";
      historicalDataResult.source = historicalDataResult?.source || 'Unknown';
    }

    // Determine final asset information with priority: snapshot > database > fallback
    const finalName = snapshot.name || assetDetails.name || symbol;
    const finalType = snapshot.type || assetDetails.type || (isCrypto ? "Crypto" : "Stock/ETF");
    const finalExchange = snapshot.exchange || snapshot.latestTrade?.x || assetDetails.exchange || "N/A";

    // Calculate price changes
    const currentPrice = snapshot.latestTrade?.p || null;
    const previousClose = snapshot.prevDailyBar?.c || null;
    const change = currentPrice && previousClose ? currentPrice - previousClose : null;
    const changePercent = change && previousClose && previousClose !== 0 
                         ? (change / previousClose) * 100 
                         : null;

    // Prepare the response object
    const responseData = {
      success: true,
      data: {
        data: {
          symbol: symbol,
          name: finalName,
          exchangeShortName: finalExchange,
          type: finalType,
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          high: snapshot.dailyBar?.h || null,
          low: snapshot.dailyBar?.l || null,
          open: snapshot.dailyBar?.o || null,
          previousClose: previousClose,
          volume: snapshot.dailyBar?.v || null,
          vwap: snapshot.dailyBar?.vw || null,
          
          // Historical chart data
          historicalData: historicalDataResult.data,
          historicalDataSource: historicalDataResult.source,
          historicalDataError: historicalDataResult.error,
          
          // News data
          news: Array.isArray(newsData) ? newsData : [],
          
          // Financial metrics
          fundamentals: {
            latestFinancials: financialMetrics.fundamentals && financialMetrics.fundamentals.length > 0 
                             ? financialMetrics.fundamentals[0] 
                             : {},
            rawFinancials: financialMetrics.fundamentals || [],
          },
          
          // Dividend information
          dividendInfo: {
            yield: financialMetrics.dividends?.dividendYield || null,
            annualAmount: financialMetrics.dividends?.annualDividendAmount || null,
          },
          
          // Data source information
          source: snapshot.source || 'N/A',
          isDelayed: snapshot.isDelayed || false,
          
          // Additional metadata
          assetSource: assetDetails.source,
          financialSource: financialMetrics.source,
        },
      },
    };

    console.log(`[StockAPI] Successfully compiled data for ${symbol}:`, {
      price: responseData.data.data.price,
      source: responseData.data.data.source,
      historicalPoints: responseData.data.data.historicalData.length,
      newsCount: responseData.data.data.news.length,
      hasFundamentals: responseData.data.data.fundamentals.rawFinancials.length > 0,
      hasDividends: !!responseData.data.data.dividendInfo.yield
    });

    // Cache the response in Redis for 15 minutes
    try {
      await redis.set(cacheKey, responseData, { ex: CACHE_DURATION_SECONDS });
      console.log(`[StockAPI] Cached data in Redis for ${symbol}`);
    } catch (error) {
      console.error(`[StockAPI] Error caching data in Redis for ${symbol}:`, error);
      // Continue without caching if Redis fails
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`[StockAPI] Error processing request:`, error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}