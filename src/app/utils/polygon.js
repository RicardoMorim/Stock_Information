const POLYGON_API_KEY = process.env.POLYGON_KEY;
const POLYGON_BASE_URL = 'https://api.polygon.io';

/**
 * Fetches ticker details for a given symbol from Polygon.io.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object|null>} - The ticker details or null if an error occurs.
 */
export async function fetchPolygonTickerDetails(symbol) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  try {
    const url = `${POLYGON_BASE_URL}/v3/reference/tickers/${symbol.toUpperCase()}?apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ticker details from Polygon for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.results) {
      return {
        name: data.results.name,
        market: data.results.market,
        locale: data.results.locale,
        primary_exchange: data.results.primary_exchange,
        type: data.results.type,
        currency_name: data.results.currency_name,
        cik: data.results.cik,
        source: 'Polygon.io',
        isDelayed: false, 
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ticker details from Polygon for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches the previous day's open, high, low, close, volume (OHLCV) for a symbol from Polygon.io.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object|null>} - The previous day's OHLCV data or null.
 */
export async function fetchPolygonPreviousClose(symbol) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  try {
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch previous close from Polygon for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.resultsCount > 0 && data.results && data.results[0]) {
      const prevBar = data.results[0];
      return {
        previousClose: prevBar.c,
        open: prevBar.o,
        high: prevBar.h,
        low: prevBar.l,
        volume: prevBar.v,
        source: 'Polygon.io',
        isDelayed: false, 
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching previous close from Polygon for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches the latest quote (NBBO) for a stock symbol from Polygon.io.
 * For Crypto, this would need a different endpoint or logic.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object|null>} - The latest quote data or null.
 */
export async function fetchPolygonLatestQuote(symbol) {
    if (!POLYGON_API_KEY) {
        console.error('Polygon API key is missing.');
        return null;
    }
    const isCrypto = symbol.includes('X:') || symbol.includes('-');
    let url;

    if (isCrypto) {
        const today = new Date().toISOString().split('T')[0];
        url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/range/1/day/${today}/${today}?adjusted=true&sort=desc&limit=1&apiKey=${POLYGON_API_KEY}`;
    } else {
        url = `${POLYGON_BASE_URL}/v2/last/nbbo/${symbol.toUpperCase()}?apiKey=${POLYGON_API_KEY}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch latest quote/trade from Polygon for ${symbol}. Status: ${response.status}`);
            return null;
        }
        const data = await response.json();

        if (isCrypto) {
            if (data.resultsCount > 0 && data.results && data.results[0]) {
                const latestBar = data.results[0];
                return {
                    price: latestBar.c,
                    bid_price: latestBar.c,
                    ask_price: latestBar.c, 
                    volume: latestBar.v,
                    source: 'Polygon.io (Daily Agg for Crypto)',
                    isDelayed: false, 
                };
            }
        } else { // Stocks
            if (data.results) {
                const quote = data.results;
                return {
                    price: quote.P, 
                    bid_price: quote.p,
                    ask_price: quote.P, 
                    source: 'Polygon.io',
                    isDelayed: false, 
                };
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching latest quote/trade from Polygon for ${symbol}:`, error);
        return null;
    }
}

/**
 * Fetches latest quote for a stock symbol from Polygon.io using /v3/quotes.
 * This provides more detailed quote information including bid/ask.
 * @param {string} symbol - The stock symbol (not for crypto).
 * @returns {Promise<object|null>} - The latest quote data or null.
 */
export async function fetchPolygonStockLatestQuote(symbol) {
    if (!POLYGON_API_KEY) {
        console.error('Polygon API key is missing.');
        return null;
    }
    if (symbol.toUpperCase().startsWith('X:')) {
        console.warn(`fetchPolygonStockLatestQuote is intended for stocks. Symbol ${symbol} looks like crypto.`);
    }

    const url = `${POLYGON_BASE_URL}/v3/quotes/${symbol.toUpperCase()}?limit=1&apiKey=${POLYGON_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch stock quote from Polygon (v3/quotes) for ${symbol}. Status: ${response.status}`);
            return null;
        }
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const quote = data.results[0];
            return {
                price: quote.ask_price,
                bid_price: quote.bid_price,
                ask_price: quote.ask_price,
                bid_size: quote.bid_size,
                ask_size: quote.ask_size,
                last_trade_price: quote.last_trade?.p, 
                last_trade_timestamp: quote.last_trade?.t, 
                source: 'Polygon.io',
                isDelayed: false,
            };
        }
        console.warn(`No quote data found in Polygon (v3/quotes) response for ${symbol}`);
        return null;
    } catch (error) {
        console.error(`Error fetching stock quote from Polygon (v3/quotes) for ${symbol}:`, error);
        return null;
    }
}


/**
 * Fetches historical price data (bars) for a symbol from Polygon.io.
 * @param {string} symbol - The stock/crypto symbol.
 * @param {string} from - The start date (YYYY-MM-DD).
 * @param {string} to - The end date (YYYY-MM-DD).
 * @param {string} timespan - e.g., 'day', 'hour', 'minute'.
 * @param {number} multiplier - e.g., 1 for 1 day, 1 for 1 hour.
 * @returns {Promise<Array<object>|null>} - Array of historical bars or null.
 */
export async function fetchPolygonHistoricalData(symbol, from, to, timespan = 'day', multiplier = 1) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  try {
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch historical data from Polygon for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.results) {
      return data.results.map(bar => ({
        t: bar.t, // Timestamp
        o: bar.o, // Open
        h: bar.h, // High
        l: bar.l, // Low
        c: bar.c, // Close
        v: bar.v, // Volume
        vw: bar.vw, // Volume Weighted Average Price
        n: bar.n, // Number of transactions
        source: 'Polygon.io',
        isDelayed: false, 
      }));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching historical data from Polygon for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches news articles for a given symbol from Polygon.io.
 * @param {string} symbol - The stock/crypto symbol.
 * @param {number} limit - Max number of articles to return.
 * @returns {Promise<Array<object>|null>} - Array of news articles or null.
 */
export async function fetchPolygonNews(symbol, limit = 10) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  try {

    const url = `${POLYGON_BASE_URL}/v2/reference/news?ticker=${symbol.toUpperCase()}&limit=${limit}&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch news from Polygon for ${symbol}. Status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.results) {
      return data.results.map(article => ({
        id: article.id,
        headline: article.title,
        summary: article.description, // Polygon uses 'description' for summary
        source_name: article.publisher?.name || 'N/A',
        url: article.article_url,
        image_url: article.image_url,
        published_at: article.published_utc,
        symbols: article.tickers,
        keywords: article.keywords,
        source_api: 'Polygon.io',
        isDelayed: false, 
      }));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching news from Polygon for ${symbol}:`, error);
    return null;
  }
}

/**
 * Combines ticker details, previous close, and latest quote for a full snapshot.
 * @param {string} symbol - The stock/crypto symbol.
 * @returns {Promise<object|null>} - Combined snapshot data or null.
 */
export async function getPolygonSnapshot(originalSymbol) {
    let symbolForPolygon = originalSymbol;
    const isLikelyCryptoByFormat = originalSymbol.toUpperCase().startsWith('X:') || originalSymbol.includes('/') || originalSymbol.includes('-');

    if (isLikelyCryptoByFormat && originalSymbol.includes('/')) {
        symbolForPolygon = `X:${originalSymbol.replace('/', '').toUpperCase()}`;
    } else if (isLikelyCryptoByFormat && originalSymbol.includes('-') && !originalSymbol.toUpperCase().startsWith('X:')) {
        symbolForPolygon = `X:${originalSymbol.replace('-', '').toUpperCase()}`;
    }

    const details = await fetchPolygonTickerDetails(symbolForPolygon);
    const prevCloseData = await fetchPolygonPreviousClose(symbolForPolygon);
    
    let latestQuoteData;
    const isConfirmedCrypto = details?.type === 'CRYPTO' || symbolForPolygon.toUpperCase().startsWith('X:');

    if (isConfirmedCrypto) {
        const cryptoSymbolForQuote = symbolForPolygon.toUpperCase().startsWith('X:') 
            ? symbolForPolygon 
            : `X:${symbolForPolygon.replace("/", "")}`;
        latestQuoteData = await fetchPolygonLatestQuote(cryptoSymbolForQuote);
    } else {
        latestQuoteData = await fetchPolygonStockLatestQuote(symbolForPolygon);
    }    // Be more strict about what constitutes a successful fetch
    // For stocks, we should have at least latestQuoteData OR prevCloseData to get a current price
    // If we're missing the latest quote (which is critical for real-time data), we should fail
    // to trigger fallback to other providers
    
    if (!latestQuoteData && !prevCloseData) {
        console.warn(`[Polygon] No price data found for ${originalSymbol} (processed as ${symbolForPolygon}) - missing both latestQuote and prevClose.`);
        return null;
    }
    
    // If we specifically failed to get latest quote data, we should be more conservative
    // and prefer to fail to other providers rather than return potentially stale data
    if (!latestQuoteData && !isConfirmedCrypto) {
        console.warn(`[Polygon] Missing latest quote data for stock ${originalSymbol}, treating as failure to enable fallback.`);
        return null;
    }
    
    // Determine current price: use latest quote price, fallback to previous close
    let currentPrice = latestQuoteData?.price;
    if (currentPrice === undefined || currentPrice === null) {
        currentPrice = prevCloseData?.previousClose;
    }
    
    // Final check: if we still don't have a price, fail
    if (currentPrice === undefined || currentPrice === null) {
        console.warn(`[Polygon] No valid price found for ${originalSymbol} after checking all sources.`);
        return null;
    }
    
    // Determine change and changePercent
    let change = null;
    let changePercent = null;
    if (currentPrice !== undefined && currentPrice !== null && prevCloseData?.previousClose !== undefined && prevCloseData?.previousClose !== null) {
        change = currentPrice - prevCloseData.previousClose;
        if (prevCloseData.previousClose !== 0) {
            changePercent = (change / prevCloseData.previousClose) * 100;
        }
    }

    return {
        symbol: originalSymbol.toUpperCase(), // Corrected: was using undefined 'symbol'
        name: details?.name || originalSymbol.toUpperCase(), // Corrected: was using undefined 'symbol'
        type: details?.type || (isConfirmedCrypto ? 'CRYPTO' : 'CS'),
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        previousClose: prevCloseData?.previousClose,
        open: prevCloseData?.open,
        high: prevCloseData?.high,
        low: prevCloseData?.low,
        volume: prevCloseData?.volume || latestQuoteData?.volume,
        market: details?.market,
        locale: details?.locale,
        primary_exchange: details?.primary_exchange,
        currency_name: details?.currency_name,
        cik: details?.cik,
        last_trade_price: latestQuoteData?.last_trade_price,
        last_trade_timestamp: latestQuoteData?.last_trade_timestamp,
        bid_price: latestQuoteData?.bid_price,
        ask_price: latestQuoteData?.ask_price,
        bid_size: latestQuoteData?.bid_size,
        ask_size: latestQuoteData?.ask_size,
        source: 'Polygon.io',
        isDelayed: false, // Polygon data is generally real-time or near real-time
        // Include raw data if needed for debugging or more detailed display
        // rawDetails: details,
        // rawPrevClose: prevCloseData,
        // rawLatestQuote: latestQuoteData
    };
}

/**
 * Fetches recent historical price data (e.g., last 7-30 days) for a symbol from Polygon.io,
 * suitable for mini charts.
 * @param {string} symbol - The stock/crypto symbol.
 * @param {number} days - Number of past days to fetch data for.
 * @returns {Promise<Array<object>|null>} - Array of historical bars (t, c) or null.
 */
export async function fetchPolygonRecentHistoricalData(symbol, days = 7) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing.');
    return null;
  }
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const timespan = 'day';
  const multiplier = 1;
  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=30&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch recent historical data from Polygon for ${symbol}. Status: ${response.status}, URL: ${url}`);
      return null;
    }
    const data = await response.json();
    if (data.results && Array.isArray(data.results)) {
      if (data.results.length === 0) {
        console.log(`Polygon returned empty results for recent historical data for ${symbol}. URL: ${url}`);
      }
      return data.results.map(bar => ({
        t: bar.t, // Timestamp
        c: bar.c, // Close price
      }));
    } else {
      console.warn(`Polygon returned no 'results' array or unexpected structure for recent historical data for ${symbol}. Response: ${JSON.stringify(data)}, URL: ${url}`);
      return []; // Return empty array if results are not as expected but response was ok
    }
  } catch (error) {
    console.error(`Error fetching recent historical data from Polygon for ${symbol}: URL: ${url}`, error);
    return null;
  }
}

/**
 * Fetches dividend data for a given symbol from Polygon.io.
 * @param {string} symbol - The stock symbol.
 * @param {number} currentPrice - The current price of the stock for yield calculation.
 * @returns {Promise<object>} - Object containing dividend yield and annual amount.
 */
export async function fetchPolygonDividendYield(symbol, currentPrice) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing for dividend yield.');
    return { yield: null, annualAmount: null, error: "API key missing" };
  }

  let symbolToFetch = symbol.toUpperCase();
  // Polygon might prefer symbols without ".X" for some lookups, though usually it handles them.
  // Example: BRK.A -> BRKA. This logic was in the original single-file API.
  if (symbolToFetch.includes(".") && !symbolToFetch.startsWith("X:")) { 
    // Check if it's a common pattern like BRK.A, not something like X:BTC-USD
    const parts = symbolToFetch.split('.');
    if (parts.length === 2 && parts[1].length === 1) { // e.g. BRK.A
        // The provided "working" code had recursive calls for this.
        // For simplicity here, we'll try the modified symbol if the first attempt fails.
    }
  }


  try {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    // Fetch dividends paid in the last full year and current year up to declaration date
    // Polygon's API fetches by ex-dividend date by default. We might want declaration_date for TTM.
    // The "working" code used declaration_date. Let's stick to that for consistency.
    // It also had a complex logic for trying last year then this year.
    // Let's simplify: fetch last 12-18 months of dividends and sum them up.
    
    const oneAndHalfYearAgo = new Date(new Date().setFullYear(currentYear - 1)).toISOString().split('T')[0]; // Approx 18 months back
    const today = new Date().toISOString().split('T')[0];

    const dividendUrl = `${POLYGON_BASE_URL}/v3/reference/dividends?ticker=${symbolToFetch}&ex_dividend_date.gte=${oneAndHalfYearAgo}&ex_dividend_date.lte=${today}&limit=50&apiKey=${POLYGON_API_KEY}`;
    
    let response = await fetch(dividendUrl);
    let dividendData = await response.json();

    // Fallback for symbols like BRK.A -> BRKA if no results
    if ((!dividendData.results || dividendData.results.length === 0) && symbol.includes(".") && !symbol.startsWith("X:")) {
        const modifiedSymbol = symbol.replace(".", "");
        console.log(`[Dividends] No results for ${symbol}, trying ${modifiedSymbol}`);
        const fallbackUrl = `${POLYGON_BASE_URL}/v3/reference/dividends?ticker=${modifiedSymbol.toUpperCase()}&ex_dividend_date.gte=${oneAndHalfYearAgo}&ex_dividend_date.lte=${today}&limit=50&apiKey=${POLYGON_API_KEY}`;
        response = await fetch(fallbackUrl);
        dividendData = await response.json();
        if (dividendData.results && dividendData.results.length > 0) {
            symbolToFetch = modifiedSymbol.toUpperCase(); // Update symbol if fallback was successful
        }
    }


    if (!response.ok) {
      console.error(`Failed to fetch dividend data from Polygon for ${symbolToFetch}. Status: ${response.status} ${response.statusText}`);
      return { yield: null, annualAmount: null, error: `API Error: ${response.status}` };
    }

    if (!dividendData.results || dividendData.results.length === 0) {
      console.log(`No dividend data found for ${symbolToFetch} in Polygon.`);
      return { yield: 0, annualAmount: 0, error: null }; // No dividends means 0 yield
    }

    // Sum dividends paid over the last 12 months from their ex-dividend date
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const annualDividendAmount = dividendData.results.reduce((acc, dividend) => {
      const exDate = new Date(dividend.ex_dividend_date);
      if (exDate >= twelveMonthsAgo && dividend.cash_amount > 0) {
        return acc + dividend.cash_amount;
      }
      return acc;
    }, 0);

    if (annualDividendAmount === 0 || !currentPrice || currentPrice === 0) {
      return { dividendYield: 0, annualDividendAmount: 0, error: null };
    }

    const dividendYield = (annualDividendAmount / currentPrice) * 100;

    return {
      dividendYield: parseFloat(dividendYield.toFixed(2)),
      annualDividendAmount: parseFloat(annualDividendAmount.toFixed(2)),
      error: null,
    };

  } catch (error) {
    console.error(`Error fetching dividend yield from Polygon for ${symbolToFetch}:`, error);
    return { yield: null, annualAmount: null, error: error.message };
  }
}

/**
 * Fetches fundamental financial data for a given symbol from Polygon.io.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<Array<object>>} - Array of fundamental data entries.
 */
export async function fetchPolygonFundamentalMetrics(symbol) {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key is missing for fundamental metrics.');
    return [];
  }
  let symbolToFetch = symbol.toUpperCase();

  try {
    // Polygon vX financials endpoint. Timeframe can be TTM, YTD, etc.
    // The "working" code fetched with limit=10, implying multiple periods.
    // Let's fetch TTM (Trailing Twelve Months) for the latest, and also allow for quarterly.
    // For simplicity and to match the route's expectation of an array, we'll fetch recent reports.
    // The endpoint is /vX/reference/financials - this is a premium endpoint.
    // If it's not available, this will fail.
    // The "working" code used `limit=10` which suggests it expected multiple reports.
    const financialsUrl = `${POLYGON_BASE_URL}/vX/reference/financials?ticker=${symbolToFetch}&limit=10&apiKey=${POLYGON_API_KEY}`;
    
    let response = await fetch(financialsUrl);
    let data = await response.json();

    // Fallback for symbols like BRK.A -> BRKA if no results
    if ((!data.results || data.results.length === 0) && symbol.includes(".") && !symbol.startsWith("X:")) {
        const modifiedSymbol = symbol.replace(".", "");
        console.log(`[Fundamentals] No results for ${symbol}, trying ${modifiedSymbol}`);
        const fallbackUrl = `${POLYGON_BASE_URL}/vX/reference/financials?ticker=${modifiedSymbol.toUpperCase()}&limit=10&apiKey=${POLYGON_API_KEY}`;
        response = await fetch(fallbackUrl);
        data = await response.json();
         if (data.results && data.results.length > 0) {
            symbolToFetch = modifiedSymbol.toUpperCase();
        }
    }

    if (!response.ok) {
      console.error(`Failed to fetch fundamental metrics from Polygon for ${symbolToFetch}. Status: ${response.status} ${response.statusText}`);
      // If 403, it's likely a subscription issue for this endpoint
      if (response.status === 403) {
        console.warn(`[Fundamentals] Polygon financials endpoint returned 403 for ${symbolToFetch}. This might be a premium feature.`);
      }
      return [];
    }

    if (!data.results || data.results.length === 0) {
      console.log(`No fundamental metrics found for ${symbolToFetch} in Polygon.`);
      return [];
    }

    // Transform data to match the structure expected by the route (from the "working" code)
    return data.results.map(result => ({
      period: {
        fiscalYear: result.fiscal_year,
        fiscalPeriod: result.fiscal_period, // e.g., Q1, Q2, FY
        startDate: result.start_date,
        endDate: result.end_date,
        filingDate: result.filing_date,
        sourceUrl: result.source_filing_url,
      },
      income: result.financials?.income_statement || {},
      cashFlow: result.financials?.cash_flow_statement || {},
      balance: result.financials?.balance_sheet || {},
      comprehensive: result.financials?.comprehensive_income || {}, // Might not always be present
      companyInfo: { // This structure was in the "working" code, Polygon might not provide all of it here
        name: result.company_name || symbolToFetch, // company_name might not be in this specific response
        tickers: result.tickers || [symbolToFetch], // tickers might not be in this specific response
      },
      source: 'Polygon.io',
    }));

  } catch (error) {
    console.error(`Error fetching fundamental metrics from Polygon for ${symbolToFetch}:`, error);
    return [];
  }
}
