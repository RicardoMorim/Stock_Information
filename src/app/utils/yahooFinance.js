// Utility functions for interacting with Yahoo Finance API
const YAHOO_CHART_API_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

/**
 * Fetches historical stock data from Yahoo Finance.
 * @param {string} symbol - The stock ticker symbol (e.g., "AAPL", "TXT.WA").
 * @param {number} daysToFetch - The number of recent days of historical data to fetch.
 * @returns {Promise<Array<{t: number, c: number}>>} A promise that resolves to an array of data points,
 *                                                  or an empty array if fetching fails or no data.
 *                                                  Each point is { t: timestamp_ms, c: close_price }.
 */
export async function getYahooFinanceHistoricalData(symbol, daysToFetch = 7) {
  // Yahoo API uses range and interval. For daily data:
  // To ensure we get enough points, especially considering non-trading days,
  // we can fetch a slightly larger range if needed, then slice.
  // Let's try to get about 2x days to be safe, e.g., for 7 days, fetch 15 days of data.
  // Common ranges: "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"
  // Common intervals: "1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"

  let range = "1mo"; // Default to 1 month to ensure enough data points for daily interval
  const interval = "1d";

  if (daysToFetch <= 5) range = "5d";
  else if (daysToFetch <= 7) range = "15d"; // Fetch more to ensure at least 7 points
  else if (daysToFetch <= 30) range = "1mo";
  else if (daysToFetch <= 90) range = "3mo";
  else if (daysToFetch <= 180) range = "6mo";
  else if (daysToFetch <= 365) range = "1y";
  else if (daysToFetch <= 365 * 2) range = "2y";
  else if (daysToFetch <= 365 * 3) range = "3y"; // Added for 3 years
  else if (daysToFetch <= 365 * 5) range = "5y";
  // Add more ranges if necessary for larger day counts
  // For very large 'daysToFetch' (e.g., > 5 years), consider 'max' or adjust logic.
  // Yahoo might not support arbitrary large day counts directly via 'daysToFetch' logic for range.
  // The 'range' parameter is more about predefined spans.

  // If daysToFetch implies a range larger than what's explicitly handled,
  // default to a large range like "5y" or "max" and then slice.
  // For 3 years (approx 3*252 trading days = 756), "3y" should be good.
  // If daysToFetch is, for example, 1000 (around 4 years), we'd use "5y".
  // The slicing logic at the end will take care of getting the exact number of days.

  // const url = `${YAHOO_CHART_API_BASE_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&indicators=close,adjclose`;
  // Removed indicators=close,adjclose as it was causing "Bad Request" for some symbols like TXT.WA
  // The function will attempt to find adjclose and close prices from the response payload itself.
  const url = `${YAHOO_CHART_API_BASE_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  console.log(`[Yahoo Finance] Fetching historical data for ${symbol} from URL: ${url}`);

  try {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            // Yahoo Finance API can sometimes be sensitive to User-Agent
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Yahoo Finance] API request failed for ${symbol} with status ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();

    if (data.chart && data.chart.error) {
      console.error(`[Yahoo Finance] API returned an error for ${symbol}: ${data.chart.error.description || data.chart.error.code}`);
      return [];
    }

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.warn(`[Yahoo Finance] No chart data found for ${symbol} in response.`);
      return [];
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp; // Array of timestamps (seconds)
    // Prefer adjusted close prices as they account for dividends and stock splits
    const adjClosePrices = result.indicators.adjclose && result.indicators.adjclose[0] && result.indicators.adjclose[0].adjclose;
    const closePrices = result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close;


    if (!timestamps || (!adjClosePrices && !closePrices)) {
      console.warn(`[Yahoo Finance] Timestamps or close prices missing for ${symbol}.`);
      return [];
    }
    
    // Use adjClosePrices if available, otherwise fallback to closePrices
    const pricesToUse = adjClosePrices || closePrices;

    const formattedData = timestamps.map((ts, index) => {
      const price = pricesToUse[index];
      if (ts !== null && price !== null && typeof price === 'number') { // Yahoo sometimes returns null for missing data
        return {
          t: ts * 1000, // Convert seconds to milliseconds
          c: parseFloat(price.toFixed(2)), // Ensure price is a number with 2 decimal places
        };
      }
      return null;
    }).filter(point => point !== null); // Remove any null entries from missing data

    // Slice to get the most recent 'daysToFetch' data points if we fetched more
    if (formattedData.length > daysToFetch) {
      return formattedData.slice(-daysToFetch);
    }
    
    console.log(`[Yahoo Finance] Successfully fetched ${formattedData.length} historical data points for ${symbol}.`);
    return formattedData;

  } catch (error) {
    console.error(`[Yahoo Finance] Error fetching or processing historical data for ${symbol}:`, error);
    return [];
  }
}

const YAHOO_NEWS_API_BASE_URL = "https://query1.finance.yahoo.com/v1/finance/search";

/**
 * Fetches news articles from Yahoo Finance.
 * @param {string} symbol - The stock ticker symbol (e.g., "AAPL", "TXT.WA").
 * @param {number} limit - The maximum number of news articles to fetch.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of news articles,
 *                                   or an empty array if fetching fails or no news.
 */
export async function getYahooFinanceNews(symbol, limit = 10) {
  const url = `${YAHOO_NEWS_API_BASE_URL}?q=${encodeURIComponent(symbol)}&lang=en-US&region=US&count=${limit}`;
  console.log(`[Yahoo Finance News] Fetching news for ${symbol} from URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Yahoo Finance News] API request failed for ${symbol} with status ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error(`[Yahoo Finance News] API returned an error for ${symbol}: ${data.error.description || data.error.code}`);
      return [];
    }

    if (!data.news || data.news.length === 0) {
      console.warn(`[Yahoo Finance News] No news found for ${symbol} in response.`);
      return [];
    }

    const formattedNews = data.news.map(article => ({
      title: article.title,
      url: article.link,
      source: article.publisher,
      summary: article.summary || '', // Yahoo search results might not have full summary
      image: article.thumbnail?.resolutions?.[0]?.url || null, // Use first available thumbnail
      published_at: new Date(article.provider_publish_time * 1000).toISOString(),
      symbols: [symbol] // Assuming the news is primarily for the queried symbol
    }));
    
    console.log(`[Yahoo Finance News] Successfully fetched ${formattedNews.length} news articles for ${symbol}.`);
    return formattedNews;

  } catch (error) {
    console.error(`[Yahoo Finance News] Error fetching or processing news for ${symbol}:`, error);
    return [];
  }
}

