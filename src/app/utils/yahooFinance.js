// Utility functions for interacting with Yahoo Finance API
const YAHOO_CHART_API_BASE_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart";

/**
 * Fetches historical stock data from Yahoo Finance.
 * @param {string} symbol - The stock ticker symbol (e.g., "AAPL", "TXT.WA").
 * @param {number} daysToFetch - The number of recent days of historical data to fetch.
 * @returns {Promise<Array<{t: number, c: number}>>} A promise that resolves to an array of data points,
 *                                                  or an empty array if fetching fails or no data.
 *                                                  Each point is { t: timestamp_ms, c: close_price }.
 */
export async function getYahooFinanceHistoricalData(symbol, daysToFetch = 7) {
  // yahoo API uses range and interval. For daily data:
  // common ranges: "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"
  // common intervals: "1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"

  let range = "1mo";
  const interval = "1d";

  if (daysToFetch <= 5) range = "5d";
  else if (daysToFetch <= 7) range = "15d";
  else if (daysToFetch <= 30) range = "1mo";
  else if (daysToFetch <= 90) range = "3mo";
  else if (daysToFetch <= 180) range = "6mo";
  else if (daysToFetch <= 365) range = "1y";
  else if (daysToFetch <= 365 * 2) range = "2y";
  else if (daysToFetch <= 365 * 3) range = "3y";
  else if (daysToFetch <= 365 * 5) range = "5y";

  const url = `${YAHOO_CHART_API_BASE_URL}/${encodeURIComponent(
    symbol
  )}?range=${range}&interval=${interval}`;
  console.log(
    `[Yahoo Finance] Fetching historical data for ${symbol} from URL: ${url}`
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // Yahoo Finance API can sometimes be sensitive to User-Agent
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Yahoo Finance] API request failed for ${symbol} with status ${response.status}: ${errorText}`
      );
      return [];
    }

    const data = await response.json();

    if (data.chart && data.chart.error) {
      console.error(
        `[Yahoo Finance] API returned an error for ${symbol}: ${
          data.chart.error.description || data.chart.error.code
        }`
      );
      return [];
    }

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.warn(
        `[Yahoo Finance] No chart data found for ${symbol} in response.`
      );
      return [];
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const adjClosePrices =
      result.indicators.adjclose &&
      result.indicators.adjclose[0] &&
      result.indicators.adjclose[0].adjclose;
    const closePrices =
      result.indicators.quote &&
      result.indicators.quote[0] &&
      result.indicators.quote[0].close;

    if (!timestamps || (!adjClosePrices && !closePrices)) {
      console.warn(
        `[Yahoo Finance] Timestamps or close prices missing for ${symbol}.`
      );
      return [];
    }

    // Use adjClosePrices if available, otherwise fallback to closePrices
    const pricesToUse = adjClosePrices || closePrices;

    const formattedData = timestamps
      .map((ts, index) => {
        const price = pricesToUse[index];
        if (ts !== null && price !== null && typeof price === "number") {
          // Yahoo sometimes returns null for missing data
          return {
            t: ts * 1000, // Convert seconds to milliseconds
            c: parseFloat(price.toFixed(2)), // Ensure price is a number with 2 decimal places
          };
        }
        return null;
      })
      .filter((point) => point !== null); // Remove any null entries from missing data

    // Slice to get the most recent 'daysToFetch' data points if we fetched more
    if (formattedData.length > daysToFetch) {
      return formattedData.slice(-daysToFetch);
    }

    console.log(
      `[Yahoo Finance] Successfully fetched ${formattedData.length} historical data points for ${symbol}.`
    );
    return formattedData;
  } catch (error) {
    console.error(
      `[Yahoo Finance] Error fetching or processing historical data for ${symbol}:`,
      error
    );
    return [];
  }
}

const YAHOO_NEWS_API_BASE_URL =
  "https://query1.finance.yahoo.com/v1/finance/search";

/**
 * Fetches news articles from Yahoo Finance.
 * @param {string} symbol - The stock ticker symbol (e.g., "AAPL", "TXT.WA").
 * @param {number} limit - The maximum number of news articles to fetch.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of news articles,
 *                                   or an empty array if fetching fails or no news.
 */
export async function getYahooFinanceNews(symbol, limit = 10) {
  const url = `${YAHOO_NEWS_API_BASE_URL}?q=${encodeURIComponent(
    symbol
  )}&lang=en-US&region=US&count=${limit}`;
  console.log(
    `[Yahoo Finance News] Fetching news for ${symbol} from URL: ${url}`
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Yahoo Finance News] API request failed for ${symbol} with status ${response.status}: ${errorText}`
      );
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error(
        `[Yahoo Finance News] API returned an error for ${symbol}: ${
          data.error.description || data.error.code
        }`
      );
      return [];
    }

    if (!data.news || data.news.length === 0) {
      console.warn(
        `[Yahoo Finance News] No news found for ${symbol} in response.`
      );
      return [];
    }

    const formattedNews = data.news.map((article) => {
      let publishedAt = null;
      if (article.provider_publish_time && typeof article.provider_publish_time === 'number') {
        try {
          publishedAt = new Date(
            article.provider_publish_time * 1000
          ).toISOString();
        } catch (e) {
          console.warn(`[Yahoo Finance News] Could not parse publish time for article: ${article.title}`, e);
        }
      }

      return {
        title: article.title,
        url: article.link,
        source: article.publisher,
        summary: article.summary || "", // Yahoo search results might not have full summary
        image: article.thumbnail?.resolutions?.[0]?.url || null, // Use first available thumbnail
        published_at: publishedAt,
        symbols: [symbol], // Assuming the news is primarily for the queried symbol
      };
    });

    console.log(
      `[Yahoo Finance News] Successfully fetched ${formattedNews.length} news articles for ${symbol}.`
    );
    return formattedNews;
  } catch (error) {
    console.error(
      `[Yahoo Finance News] Error fetching or processing news for ${symbol}:`,
      error
    );
    return [];
  }
}

/**
 * Fetches snapshot data for a given symbol from Yahoo Finance (using the chart API as a proxy for quote).
 * @param {string} symbol - The stock ticker symbol (e.g., "AAPL", "BTC-USD").
 * @returns {Promise<object|null>} A promise that resolves to a formatted snapshot object,
 *                                   or null if fetching fails or no data.
 */
export async function getYahooFinanceSnapshot(symbol) {
  // Yahoo Finance chart endpoint can provide current price, previous close, day high/low, volume.
  // We use a very short range to get the latest available data.
  const url = `${YAHOO_CHART_API_BASE_URL}/${encodeURIComponent(symbol)}?range=2d&interval=1d`;
  console.log(
    `[Yahoo Finance Snapshot] Fetching snapshot-like data for ${symbol} from URL: ${url}`
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Yahoo Finance Snapshot] API request failed for ${symbol} with status ${response.status}: ${errorText}`
      );
      return null;
    }

    const data = await response.json();

    if (data.chart && data.chart.error) {
      console.error(
        `[Yahoo Finance Snapshot] API returned an error for ${symbol}: ${
          data.chart.error.description || data.chart.error.code
        }`
      );
      return null;
    }

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.warn(
        `[Yahoo Finance Snapshot] No chart data found for ${symbol} in response.`
      );
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const indicators = result.indicators.quote[0];
    const timestamps = result.timestamp;

    if (!meta || !indicators || !timestamps || timestamps.length === 0) {
      console.warn(
        `[Yahoo Finance Snapshot] Essential data missing in Yahoo response for ${symbol}.`
      );
      return null;
    }

    // Get the latest available data point (usually the last one in the array for 1d interval)
    const latestIndex = timestamps.length - 1;
    const previousIndex = timestamps.length > 1 ? timestamps.length - 2 : null;

    const currentPrice = meta.regularMarketPrice !== undefined ? meta.regularMarketPrice : (indicators.close ? indicators.close[latestIndex] : null);
    const previousClose = meta.chartPreviousClose !== undefined ? meta.chartPreviousClose : (previousIndex !== null && indicators.close ? indicators.close[previousIndex] : null);
    
    const dailyOpen = indicators.open ? indicators.open[latestIndex] : null;
    const dailyHigh = indicators.high ? indicators.high[latestIndex] : null;
    const dailyLow = indicators.low ? indicators.low[latestIndex] : null;
    const dailyVolume = indicators.volume ? indicators.volume[latestIndex] : null;

    if (currentPrice === null) {
        console.warn(`[Yahoo Finance Snapshot] Could not determine current price for ${symbol}.`);
        return null; // If no current price, snapshot is not useful
    }

    const formattedSnapshot = {
      latestTrade: {
        p: currentPrice,
        x: meta.exchangeName || null, // Exchange ID/Name
      },
      dailyBar: {
        o: dailyOpen,
        h: dailyHigh,
        l: dailyLow,
        c: currentPrice, // Current price is the most recent closing price for the daily bar
        v: dailyVolume,
      },
      prevDailyBar: {
        c: previousClose,
      },
      name: meta.shortName || meta.longName || symbol,
      type: meta.instrumentType || (symbol.includes('-') ? 'Crypto' : 'Stock'), // Infer type
      exchange: meta.exchangeName || null,
      source: 'Yahoo Finance',
      isDelayed: meta.exchangeDelay !== undefined ? meta.exchangeDelay > 0 : true, // Assume delayed if not specified
    };

    console.log(
      `[Yahoo Finance Snapshot] Successfully processed snapshot for ${symbol}.`
    );
    return formattedSnapshot;

  } catch (error) {
    console.error(
      `[Yahoo Finance Snapshot] Error fetching or processing snapshot for ${symbol}:`,
      error
    );
    return null;
  }
}
