const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = process.env.ALPHA_VANTAGE_KEY;

/**
 * Fetches general stock data (e.g., overview, quote) for a given symbol from Alpha Vantage.
 * Alpha Vantage data is typically end-of-day.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object|null>} - The stock data or null if an error occurs.
 */
export async function fetchAlphaVantageStockData(symbol) {
  if (!API_KEY) {
    console.error('Alpha Vantage API key is missing.');
    return null;
  }
  try {
    // Example: Fetching Global Quote (for price) and Overview (for company details)
    // Adjust function and parameters as needed based on specific data requirements.
    const quoteUrl = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    const overviewUrl = `${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;

    const [quoteResponse, overviewResponse] = await Promise.all([
      fetch(quoteUrl),
      fetch(overviewUrl)
    ]);

    if (!quoteResponse.ok && !overviewResponse.ok) {
      console.error(`Failed to fetch data from Alpha Vantage for ${symbol}. Status: Q-${quoteResponse.status}, O-${overviewResponse.status}`);
      return null;
    }
    
    let quoteData = null;
    if (quoteResponse.ok) {
        const rawQuoteData = await quoteResponse.json();
        if (rawQuoteData["Global Quote"]) {
            quoteData = {
                price: parseFloat(rawQuoteData["Global Quote"]["05. price"]),
                change: parseFloat(rawQuoteData["Global Quote"]["09. change"]),
                changePercent: parseFloat(rawQuoteData["Global Quote"]["10. change percent"].replace('%','')),
                previousClose: parseFloat(rawQuoteData["Global Quote"]["08. previous close"]),
                open: parseFloat(rawQuoteData["Global Quote"]["02. open"]),
                high: parseFloat(rawQuoteData["Global Quote"]["03. high"]),
                low: parseFloat(rawQuoteData["Global Quote"]["04. low"]),
                volume: parseInt(rawQuoteData["Global Quote"]["06. volume"], 10),
                latestTradingDay: rawQuoteData["Global Quote"]["07. latest trading day"],
                source: 'Alpha Vantage',
                isDelayed: true
            };
        } else if (rawQuoteData.Note) {
            console.warn(`Alpha Vantage API limit reached or other note for quote: ${rawQuoteData.Note}`);
        }
    }

    let overviewData = null;
    if (overviewResponse.ok) {
        const rawOverviewData = await overviewResponse.json();
        if (rawOverviewData.Symbol && rawOverviewData.Symbol === symbol) { // Check if data is valid
            overviewData = {
                name: rawOverviewData.Name,
                description: rawOverviewData.Description,
                exchange: rawOverviewData.Exchange,
                currency: rawOverviewData.Currency,
                country: rawOverviewData.Country,
                sector: rawOverviewData.Sector,
                industry: rawOverviewData.Industry,
                marketCap: parseFloat(rawOverviewData.MarketCapitalization),
                peRatio: parseFloat(rawOverviewData.PERatio),
                eps: parseFloat(rawOverviewData.EPS),
                beta: parseFloat(rawOverviewData.Beta),
                dividendYield: parseFloat(rawOverviewData.DividendYield),
                profitMargin: parseFloat(rawOverviewData.ProfitMargin),
                source: 'Alpha Vantage',
                isDelayed: true
            };
        } else if (rawOverviewData.Note) {
            console.warn(`Alpha Vantage API limit reached or other note for overview: ${rawOverviewData.Note}`);
        }
    }
    
    if (!quoteData && !overviewData) {
        console.warn(`No data retrieved from Alpha Vantage for ${symbol}`);
        return null;
    }

    return { ...overviewData, ...quoteData, symbol: symbol.toUpperCase(), source: 'Alpha Vantage', isDelayed: true };

  } catch (error) {
    console.error(`Error fetching stock data from Alpha Vantage for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches news for a given stock symbol from Alpha Vantage.
 * Alpha Vantage news data can also be delayed.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<Array<object>|null>} - An array of news articles or null if an error occurs.
 */
export async function fetchAlphaVantageNews(symbol) {
  if (!API_KEY) {
    console.error('Alpha Vantage API key is missing.');
    return null;
  }
  try {
    // Alpha Vantage provides news through the "NEWS_SENTIMENT" function.
    // It can be filtered by tickers.
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch news from Alpha Vantage for ${symbol}. Status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.Note) {
      console.warn(`Alpha Vantage API limit reached or other note for news: ${data.Note}`);
      return []; // Return empty array if limit reached, to not break flow
    }
    
    if (data.feed && Array.isArray(data.feed)) {
      return data.feed.map(article => ({
        id: article.url, // Assuming URL is unique enough for an ID
        headline: article.title,
        summary: article.summary,
        source_name: article.source, // 'source' is the key in AV feed
        url: article.url,
        image_url: article.banner_image,
        published_at: new Date(article.time_published.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z')).toISOString(), // Format: YYYYMMDDTHHMMSS to ISO
        symbols: article.ticker_sentiment?.map(ts => ts.ticker) || [symbol],
        source_api: 'Alpha Vantage',
        isDelayed: true
      }));
    }
    console.warn(`No news feed found in Alpha Vantage response for ${symbol} or data is not in expected format.`);
    return []; // Return empty if no news or unexpected format
  } catch (error) {
    console.error(`Error fetching news from Alpha Vantage for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches daily historical time series data for a given symbol from Alpha Vantage.
 * @param {string} symbol - The stock symbol.
 * @param {number} days - Number of past trading days to fetch (approximate, AV might return more or less).
 * @returns {Promise<Array<{t: number, c: number}>|null>} - Array of historical bars or null.
 */
export async function getAlphaVantageHistoricalDaily(symbol, days = 7) {
  if (!API_KEY) {
    console.error('Alpha Vantage API key is missing for getAlphaVantageHistoricalDaily.');
    return null;
  }
  try {
    // TIME_SERIES_DAILY returns up to 100 latest data points.
    // 'outputsize=compact' returns the latest 100 data points.
    // 'outputsize=full' returns the full-length time series.
    // We'll use compact and then slice to get approximately `days`.
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch daily historical data from Alpha Vantage for ${symbol}. Status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.Note) {
      console.warn(`Alpha Vantage API limit reached or other note for TIME_SERIES_DAILY on ${symbol}: ${data.Note}`);
      return null; // Return null if limit reached or other API note
    }

    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      console.warn(`No "Time Series (Daily)" data found in Alpha Vantage response for ${symbol}. Response:`, JSON.stringify(data));
      return null;
    }

    const dates = Object.keys(timeSeries).sort((a, b) => new Date(b) - new Date(a)); // Sort dates descending to get latest first
    const recentDates = dates.slice(0, days); // Take the most recent `days`

    const formattedData = recentDates.map(date => ({
      t: new Date(date).getTime(),
      c: parseFloat(timeSeries[date]["4. close"])
    })).sort((a,b) => a.t - b.t); // Ensure ascending order for charts

    if (formattedData.length === 0) {
        console.warn(`Alpha Vantage returned no processable historical daily bars for ${symbol} after filtering for ${days} days.`);
        return null;
    }

    // console.log(`Successfully fetched ${formattedData.length} historical daily bars from Alpha Vantage for ${symbol}`);
    return formattedData;

  } catch (error) {
    console.error(`Error fetching daily historical data from Alpha Vantage for ${symbol}:`, error);
    return null;
  }
}
