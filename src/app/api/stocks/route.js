import { NextResponse } from 'next/server';
import { alpaca } from '@/app/utils/alpaca'; // Assuming alpaca client is exported from here

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
const MAIN_STOCK_ETF_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'SPY', 'QQQ', 'DIA', 'IWM'];
const MAIN_CRYPTO_TICKERS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'ADA/USD']; // Alpaca uses / for crypto pairs

async function fetchMainStocksData() {
    const now = Date.now();
    if (mainStocksCache.data && (now - mainStocksCache.lastFetched < CACHE_DURATION)) {
        console.log("Serving main stocks data from cache.");
        return mainStocksCache.data;
    }
    console.log("Fetching main stocks data from Alpaca API.");

    try {
        let fetchedMainStocks = [];

        // Fetch stock/ETF data
        if (MAIN_STOCK_ETF_TICKERS.length > 0) {
            const stockSnapshots = await alpaca.getSnapshots({ symbols: MAIN_STOCK_ETF_TICKERS });
            MAIN_STOCK_ETF_TICKERS.forEach(symbol => {
                const snapshot = stockSnapshots[symbol];
                if (snapshot) {
                    fetchedMainStocks.push({
                        symbol: snapshot.symbol,
                        name: snapshot.symbol, // Placeholder, will be enriched later
                        price: snapshot.latestTrade?.p || null, // Use null if no price
                        changePercent: snapshot.todaysChangePerc || null, // Use null if no change
                        exchangeShortName: snapshot.latestTrade?.x || 'N/A',
                        type: 'Stock/ETF', 
                    });
                }
            });
        }

        // Fetch crypto data
        if (MAIN_CRYPTO_TICKERS.length > 0) {
            const cryptoSnapshots = await alpaca.getCryptoSnapshots({ symbols: MAIN_CRYPTO_TICKERS });
            MAIN_CRYPTO_TICKERS.forEach(symbol => {
                const snapshot = cryptoSnapshots[symbol];
                if (snapshot) {
                    fetchedMainStocks.push({
                        symbol: snapshot.symbol,
                        name: snapshot.symbol, // Placeholder, will be enriched later
                        price: snapshot.latestTrade?.p || null,
                        changePercent: (snapshot.dailyChange || 0) * 100, // dailyChange is a ratio, default to 0 if null
                        exchangeShortName: snapshot.latestTrade?.x || 'CRYPTO',
                        type: 'Crypto',
                    });
                }
            });
        }
        
        mainStocksCache = { data: fetchedMainStocks, lastFetched: now };
        return fetchedMainStocks;
    } catch (error) {
        console.error('Error fetching main stocks data from Alpaca:', error.message || error.toString());
        if (mainStocksCache.data) {
            console.warn("Serving stale main stocks data due to fetch error.");
            return mainStocksCache.data; 
        }
        throw new Error('Failed to fetch main stocks data.');
    }
}

async function fetchSearchableList() {
    const now = Date.now();
    if (searchableListCache.data && (now - searchableListCache.lastFetched < CACHE_DURATION)) {
        console.log("Serving searchable list from cache.");
        return searchableListCache.data;
    }
    console.log("Fetching searchable list from Alpaca API.");

    try {
        // Fetch active US equities and crypto assets
        const stockAssets = await alpaca.getAssets({ status: 'active', asset_class: 'us_equity' });
        const cryptoAssets = await alpaca.getAssets({ status: 'active', asset_class: 'crypto' });

        const combinedAssets = [...stockAssets, ...cryptoAssets];
        const formattedAssets = combinedAssets.map(asset => ({
            symbol: asset.symbol,
            name: asset.name,
            // You could add more details here if needed by StockCard when displaying search results
            // e.g., type: asset.asset_class === 'crypto' ? 'Crypto' : (asset.tradable ? 'Stock/ETF' : 'Other')
        }));

        searchableListCache = { data: formattedAssets, lastFetched: now };
        return formattedAssets;
    } catch (error) {
        console.error('Error fetching searchable list from Alpaca:', error.message || error.toString());
        if (searchableListCache.data) {
            console.warn("Serving stale searchable list due to fetch error.");
            return searchableListCache.data; 
        }
        throw new Error('Failed to fetch searchable asset list.');
    }
}

export async function GET(request) {
    try {
        const mainStocksPromise = fetchMainStocksData();
        const searchableListPromise = fetchSearchableList();

        // Await both promises concurrently
        const [mainStocksData, searchableList] = await Promise.all([mainStocksPromise, searchableListPromise]);
        
        // Enrich mainStocksData with names from searchableList for better display
        const enrichedMainStocksData = mainStocksData.map(mainStock => {
            const assetInfo = searchableList.find(s => s.symbol === mainStock.symbol);
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
        console.error('[API/STOCKS] Error:', error.message || error.toString());
        return NextResponse.json(
            { success: false, message: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
