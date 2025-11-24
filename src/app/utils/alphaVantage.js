const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;

/**
 * Fetches general stock data (e.g., overview, quote) for a given symbol from Alpha Vantage.
 * Alpha Vantage data is typically end-of-day.
 * @param {string} symbol - The stock symbol.
 * @returns {Promise<object|null>} - The stock data or null if an error occurs.
 */
export async function fetchAlphaVantageStockData(symbol) {
  if (!ALPHA_VANTAGE_KEY) {
    console.error('Alpha Vantage API key is missing.');
    return null;
  }
  try {
    const quoteUrl = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const overviewUrl = `${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;

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
        if (rawQuoteData["Global Quote"] && rawQuoteData["Global Quote"]["05. price"]) {
            const gq = rawQuoteData["Global Quote"];
            quoteData = {
                price: parseFloat(gq["05. price"]) || null,
                change: parseFloat(gq["09. change"]) || null,
                changePercent: gq["10. change percent"] 
                    ? parseFloat(gq["10. change percent"].replace('%', '')) 
                    : null,
                previousClose: parseFloat(gq["08. previous close"]) || null,
                open: parseFloat(gq["02. open"]) || null,
                high: parseFloat(gq["03. high"]) || null,
                low: parseFloat(gq["04. low"]) || null,
                volume: parseInt(gq["06. volume"], 10) || null,
                latestTradingDay: gq["07. latest trading day"] || null,
                source: 'Alpha Vantage',
                isDelayed: true
            };
        } else if (rawQuoteData.Note) {
            console.warn(`Alpha Vantage API limit reached or other note for quote: ${rawQuoteData.Note}`);
        } else {
            console.warn(`Alpha Vantage returned empty or invalid Global Quote for ${symbol}`);
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
  if (!ALPHA_VANTAGE_KEY) {
    console.error('Alpha Vantage API key is missing.');
    return null;
  }
  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch news from Alpha Vantage for ${symbol}. Status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.Note) {
      console.warn(`Alpha Vantage API limit reached or other note for news: ${data.Note}`);
      return []; 
    }
    
    if (data.feed && Array.isArray(data.feed)) {
      return data.feed.map(article => ({
        id: article.url, 
        headline: article.title,
        summary: article.summary,
        source_name: article.source, 
        url: article.url,
        image_url: article.banner_image,
        published_at: new Date(article.time_published.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z')).toISOString(), // Format: YYYYMMDDTHHMMSS to ISO
        symbols: article.ticker_sentiment?.map(ts => ts.ticker) || [symbol],
        source_api: 'Alpha Vantage',
        isDelayed: true
      }));
    }
    console.warn(`No news feed found in Alpha Vantage response for ${symbol} or data is not in expected format.`);
    return []; 
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
  if (!ALPHA_VANTAGE_KEY) {
    console.error('Alpha Vantage API key is missing for getAlphaVantageHistoricalDaily.');
    return null;
  }
  try {
    // For future reference:
    // TIME_SERIES_DAILY returns up to 100 latest data points.
    // 'outputsize=compact' returns the latest 100 data points.
    // 'outputsize=full' returns the full-length time series.
    // we are use compact and then slice to get approximately `days`.
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch daily historical data from Alpha Vantage for ${symbol}. Status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.Note) {
      console.warn(`Alpha Vantage API limit reached or other note for TIME_SERIES_DAILY on ${symbol}: ${data.Note}`);
      return null; 
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


    return formattedData;

  } catch (error) {
    console.error(`Error fetching daily historical data from Alpha Vantage for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches daily historical time series data for a given digital currency symbol from Alpha Vantage.
 * @param {string} symbol - The digital currency symbol (e.g., BTC).
 * @param {number} days - Number of past trading days to fetch (approximate, AV might return more or less).
 * @param {string} market - The market to fetch the data in (e.g., USD, EUR).
 * @returns {Promise<Array<{t: number, c: number}>|null>} - Array of historical bars or null.
 */
export async function getAlphaVantageDigitalCurrencyDaily(symbol, days = 7, market = 'USD') {
  if (!ALPHA_VANTAGE_KEY) {
    console.warn("Alpha Vantage API key is not set. Skipping Alpha Vantage digital currency fetch.");
    return null;
  }
  try {
    const url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=${market}&apikey=${ALPHA_VANTAGE_KEY}`;
    console.log(`Fetching Alpha Vantage Digital Currency Daily for ${symbol} in market ${market}: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Alpha Vantage API error for ${symbol}: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Alpha Vantage error body:", errorBody);
      return null;
    }
    const data = await response.json();
    if (data['Error Message'] || !data['Time Series (Digital Currency Daily)']) {
      console.warn(`Alpha Vantage - No data or error for ${symbol}: ${data['Error Message'] || 'Data format issue'}`);
      if (data['Note']) {
        console.warn(`Alpha Vantage API Note for ${symbol}: ${data['Note']}`);
      }
      return null;
    }

    const timeSeries = data['Time Series (Digital Currency Daily)'];
    const formattedData = Object.entries(timeSeries)
      .slice(0, days) // Take the most recent 'days' entries
      .map(([date, values]) => ({
        t: new Date(date).getTime(),
        c: parseFloat(values[`4a. close (${market})`] || values['4. close']), // Adjusted to common market close key
      }))
      .sort((a, b) => a.t - b.t); // Ensure ascending order by time

    console.log(`Successfully fetched and formatted Alpha Vantage digital currency data for ${symbol}`);
    return formattedData;
  } catch (error) {
    console.error(`Error fetching or processing Alpha Vantage digital currency data for ${symbol}:`, error);
    return null;
  }
}
