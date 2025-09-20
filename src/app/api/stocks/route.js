import { NextResponse } from "next/server";
import { Redis } from '@upstash/redis';
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

// Initialize Redis with Vercel KV credentials
const redis = Redis.fromEnv();

console.log('Redis config debug:', {
    url: process.env.UPSTASH_REDIS_REST_URL ? 'present' : 'missing',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ? 'present' : 'missing',
});

const CACHE_DURATION_SECONDS = 30 * 60;
const MAIN_STOCKS_CACHE_KEY = "mainStocksData";
const SEARCHABLE_LIST_CACHE_KEY = "searchableListData";

// Configuration
const MAIN_STOCK_ETF_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "TSLA", "AMZN",
    "NVDA", "SPY", "QQQ", "DIA", "IWM",
];

const MAIN_CRYPTO_TICKERS = [
    "BTC/USD", "ETH/USD", "SOL/USD", "DOGE/USD", "ADA/USD",
];

const CHART_CONFIG = {
    DAYS_TO_FETCH: 7,
    MIN_POINTS: 3,
};

// Utility functions
async function safeRedisOperation(operation, fallback = null) {
    try {
        return await operation();
    } catch (error) {
        console.error('[Redis] Operation failed:', error.message);
        return fallback;
    }
}

// Generic chart data fetcher with parallel API calls
async function fetchChartDataParallel(symbol, isTypeCrypto = false) {
    const promises = [];

    if (isTypeCrypto) {
        const polygonSymbol = symbol.includes("/") ? `X:${symbol.replace("/", "")}` : symbol;
        const alphaVantageSymbol = symbol.split("/")[0];

        promises.push(
            fetchPolygonRecentHistoricalData(polygonSymbol, CHART_CONFIG.DAYS_TO_FETCH)
                .catch(() => null),
            getAlpacaHistoricalBars(symbol, CHART_CONFIG.DAYS_TO_FETCH, true)
                .catch(() => null),
            getAlphaVantageDigitalCurrencyDaily(alphaVantageSymbol, CHART_CONFIG.DAYS_TO_FETCH)
                .catch(() => null)
        );
    } else {
        promises.push(
            getAlpacaHistoricalBars(symbol, CHART_CONFIG.DAYS_TO_FETCH, false)
                .catch(() => null),
            fetchPolygonRecentHistoricalData(symbol, CHART_CONFIG.DAYS_TO_FETCH)
                .catch(() => null),
            getAlphaVantageHistoricalDaily(symbol, CHART_CONFIG.DAYS_TO_FETCH)
                .catch(() => null),
            getYahooFinanceHistoricalData(symbol, CHART_CONFIG.DAYS_TO_FETCH)
                .catch(() => null)
        );
    }

    const results = await Promise.allSettled(promises);
    const chartDataArrays = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value)
        .filter(data => Array.isArray(data) && data.length > 0);

    // Return the dataset with the most points, preferring those with MIN_POINTS+
    const bestData = chartDataArrays
            .sort((a, b) => b.length - a.length)
            .find(data => data.length >= CHART_CONFIG.MIN_POINTS) ||
        chartDataArrays[0] || [];

    console.log(`[Chart] ${symbol}: Found ${bestData.length} data points`);
    return bestData;
}

// Calculate change percentage from chart data
function calculateChangePercent(miniChartData) {
    if (!miniChartData || miniChartData.length < 2) return null;

    const currentClose = miniChartData[miniChartData.length - 1].c;
    const previousClose = miniChartData[miniChartData.length - 2].c;

    if (typeof currentClose !== 'number' || typeof previousClose !== 'number' || previousClose === 0) {
        return null;
    }

    return ((currentClose - previousClose) / previousClose) * 100;
}

// Process individual stock/crypto data
async function processAssetData(symbol, snapshot, isTypeCrypto = false) {
    if (!snapshot) {
        console.warn(`No snapshot data for ${symbol}`);
        return null;
    }

    const latestPrice = snapshot.latestTrade?.p || snapshot.latestQuote?.ap || null;
    let changePercent = null;

    // Try to get change percent from snapshot first
    if (isTypeCrypto) {
        if (snapshot.dailyBar?.c && snapshot.prevDailyBar?.c && snapshot.prevDailyBar.c !== 0) {
            changePercent = ((snapshot.dailyBar.c - snapshot.prevDailyBar.c) / snapshot.prevDailyBar.c) * 100;
        } else if (snapshot.dailyChange !== undefined) {
            changePercent = snapshot.dailyChange * 100;
        }
    } else {
        if (snapshot.dailyChange !== undefined) {
            changePercent = snapshot.dailyChange * 100;
        }
    }

    // Fetch chart data in parallel
    const miniChartData = await fetchChartDataParallel(symbol, isTypeCrypto);

    // Calculate change percent from chart data if not available from snapshot
    if (changePercent === null || isNaN(changePercent)) {
        changePercent = calculateChangePercent(miniChartData);
    }

    return {
        symbol,
        name: symbol, // Will be enriched later
        price: latestPrice,
        changePercent,
        exchangeShortName: snapshot.latestTrade?.x || snapshot.latestQuote?.x || (isTypeCrypto ? "CRYPTO" : "N/A"),
        type: isTypeCrypto ? "Crypto" : "Stock/ETF",
        source: "Alpaca",
        isDelayed: false,
        miniChartData,
    };
}

// Main data fetching functions
async function fetchMainStocksData() {
    // Try cache first
    const cachedData = await safeRedisOperation(() => redis.get(MAIN_STOCKS_CACHE_KEY));
    if (cachedData) {
        console.log("Serving main stocks data from Redis cache.");
        return cachedData;
    }

    console.log("Fetching fresh main stocks data...");

    try {
        // Fetch snapshots in parallel
        const [stockSnapshots, cryptoSnapshots] = await Promise.allSettled([
            getAlpacaSnapshots(MAIN_STOCK_ETF_TICKERS, false),
            getAlpacaSnapshots(MAIN_CRYPTO_TICKERS, true)
        ]);

        const stockSnapshotsData = stockSnapshots.status === 'fulfilled' ? stockSnapshots.value : {};
        const cryptoSnapshotsData = cryptoSnapshots.status === 'fulfilled' ? cryptoSnapshots.value : {};

        // Process all assets in parallel
        const allProcessingPromises = [
            // Process stocks
            ...MAIN_STOCK_ETF_TICKERS.map(symbol =>
                processAssetData(symbol, stockSnapshotsData[symbol], false)
            ),
            // Process crypto
            ...MAIN_CRYPTO_TICKERS.map(symbol =>
                processAssetData(symbol, cryptoSnapshotsData[symbol], true)
            )
        ];

        const results = await Promise.allSettled(allProcessingPromises);
        const fetchedMainStocks = results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);

        console.log(`Successfully processed ${fetchedMainStocks.length} assets`);

        // Cache the results
        await safeRedisOperation(() =>
            redis.set(MAIN_STOCKS_CACHE_KEY, fetchedMainStocks, { ex: CACHE_DURATION_SECONDS })
        );

        return fetchedMainStocks;

    } catch (error) {
        console.error("Error in fetchMainStocksData:", error.message);
        throw new Error(`Failed to fetch main stocks data: ${error.message}`);
    }
}

async function fetchSearchableList() {
    // Try cache first
    const cachedData = await safeRedisOperation(() => redis.get(SEARCHABLE_LIST_CACHE_KEY));
    if (cachedData) {
        console.log("Serving searchable list from Redis cache.");
        return cachedData;
    }

    console.log("Fetching fresh searchable list...");

    try {
        const internalApiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const response = await fetch(`${internalApiUrl}/api/stocks/allStocks`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Failed to fetch searchable list: ${errorData.message}`);
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error("Invalid data format from searchable list API");
        }

        const formattedAssets = result.data.map(asset => ({
            symbol: asset.symbol,
            name: asset.name,
            exchangeShortName: asset.exchangeShortName,
            type: asset.type,
            country: asset.country,
            marketIdentifier: asset.marketIdentifier,
        }));

        console.log(`Fetched ${formattedAssets.length} searchable assets`);

        // Cache the results
        await safeRedisOperation(() =>
            redis.set(SEARCHABLE_LIST_CACHE_KEY, formattedAssets, { ex: CACHE_DURATION_SECONDS })
        );

        return formattedAssets;

    } catch (error) {
        console.error("Error in fetchSearchableList:", error.message);
        throw new Error(`Failed to fetch searchable list: ${error.message}`);
    }
}

// Main API handler
export async function GET(request) {
    try {
        // Fetch both data sources in parallel
        const [mainStocksData, searchableList] = await Promise.all([
            fetchMainStocksData(),
            fetchSearchableList(),
        ]);

        // Enrich main stocks with names from searchable list
        const enrichedMainStocksData = mainStocksData.map(mainStock => {
            const assetInfo = searchableList.find(asset => asset.symbol === mainStock.symbol);
            return {
                ...mainStock,
                name: assetInfo?.name || mainStock.name,
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                mainStocksData: enrichedMainStocksData,
                searchableList,
            },
        });

    } catch (error) {
        console.error("[API/STOCKS] Error:", error.message);
        return NextResponse.json(
            {
                success: false,
                message: error.message || "Internal server error"
            },
            { status: 500 }
        );
    }
}