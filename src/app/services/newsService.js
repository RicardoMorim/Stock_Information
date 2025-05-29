
import { fetchPolygonNews } from "@/app/utils/polygon";
import { getYahooFinanceNews } from "@/app/utils/yahooFinance";
import { fetchAlphaVantageNews } from "@/app/utils/alphaVantage";

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;

/**
 * Fetches news articles with fallback mechanism
 * Tries: Polygon -> Yahoo Finance -> Alpaca -> Alpha Vantage
 * @param {string} symbol - The stock symbol to fetch news for
 * @returns {Promise<Array>} - Array of news articles
 */
export async function fetchNewsWithFallback(symbol) {
  let fetchedNews = [];

  console.log(`[NewsService] Starting news fallback mechanism for ${symbol}`);

  // 1. Try Polygon.io first
  console.log(`[NewsService] Trying Polygon for ${symbol}`);
  try {
    const polygonNews = await fetchPolygonNews(symbol, 10);
    
    if (polygonNews && polygonNews.length > 0) {
      console.log(`[NewsService] Polygon success for ${symbol}: ${polygonNews.length} articles`);
      return polygonNews.map(n => ({ ...n, source: n.source || 'Polygon.io' }));
    }
    console.warn(`[NewsService] Polygon returned no news for ${symbol}`);
  } catch (error) {
    console.error(`[NewsService] Polygon error for ${symbol}:`, error.message);
  }

  // 2. Try Yahoo Finance News
  if (fetchedNews.length === 0) {
    console.log(`[NewsService] Trying Yahoo Finance for ${symbol}`);
    try {
      const yahooNews = await getYahooFinanceNews(symbol, 10);
      
      if (yahooNews && yahooNews.length > 0) {
        console.log(`[NewsService] Yahoo Finance success for ${symbol}: ${yahooNews.length} articles`);
        return yahooNews;
      }
      console.warn(`[NewsService] Yahoo Finance returned no news for ${symbol}`);
    } catch (error) {
      console.error(`[NewsService] Yahoo Finance error for ${symbol}:`, error.message);
    }
  }

  // 3. Try Alpaca (primarily for US stocks)
  if (fetchedNews.length === 0) {
    console.log(`[NewsService] Trying Alpaca for ${symbol}`);
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
          console.log(`[NewsService] Alpaca success for ${symbol}: ${alpacaJson.news.length} articles`);
          
          return alpacaJson.news.map(article => ({
            id: article.id,
            headline: article.headline,
            summary: article.summary || '',
            source_name: article.source || 'Alpaca',
            url: article.url,
            image_url: article.images && article.images.length > 0 ? article.images[0].url : null,
            published_at: article.created_at || article.updated_at,
            symbols: article.symbols || [symbol],
            source: 'Alpaca',
          }));
        }
        console.warn(`[NewsService] Alpaca returned no news for ${symbol}`);
      } else {
        console.warn(`[NewsService] Alpaca API error for ${symbol}: ${response.status}`);
      }
    } catch (error) {
      console.error(`[NewsService] Alpaca error for ${symbol}:`, error.message);
    }
  }

  // 4. Try Alpha Vantage as final fallback
  if (fetchedNews.length === 0) {
    console.log(`[NewsService] Trying Alpha Vantage for ${symbol}`);
    try {
      const alphaVantageNews = await fetchAlphaVantageNews(symbol);
      
      if (alphaVantageNews && alphaVantageNews.length > 0) {
        console.log(`[NewsService] Alpha Vantage success for ${symbol}: ${alphaVantageNews.length} articles`);
        return alphaVantageNews.map(n => ({ ...n, source: n.source || 'Alpha Vantage' }));
      }
      console.warn(`[NewsService] Alpha Vantage returned no news for ${symbol}`);
    } catch (error) {
      console.error(`[NewsService] Alpha Vantage error for ${symbol}:`, error.message);
    }
  }

  console.log(`[NewsService] No news found for ${symbol} from any provider`);
  return [];
}
