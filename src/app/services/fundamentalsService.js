
import { fetchPolygonDividendYield, fetchPolygonFundamentalMetrics } from "@/app/utils/polygon";

/**
 * Fetches dividend yield data for a given symbol
 * @param {string} symbol - The stock symbol
 * @param {number} currentPrice - Current stock price for yield calculation
 * @returns {Promise<object>} - Dividend data object
 */
export async function fetchDividendData(symbol, currentPrice) {
  console.log(`[FundamentalsService] Fetching dividend data for ${symbol}`);
  
  try {
    const dividendData = await fetchPolygonDividendYield(symbol, currentPrice);
    
    if (dividendData) {
      console.log(`[FundamentalsService] Dividend data found for ${symbol}:`, {
        yield: dividendData.dividendYield,
        annualAmount: dividendData.annualDividendAmount
      });
      return dividendData;
    } else {
      console.log(`[FundamentalsService] No dividend data found for ${symbol}`);
      return { dividendYield: null, annualDividendAmount: null };
    }
  } catch (error) {
    console.error(`[FundamentalsService] Error fetching dividend data for ${symbol}:`, error.message);
    return { dividendYield: null, annualDividendAmount: null };
  }
}

/**
 * Fetches fundamental financial metrics for a given symbol
 * @param {string} symbol - The stock symbol
 * @returns {Promise<Array>} - Array of fundamental metrics
 */
export async function fetchFundamentalMetrics(symbol) {
  console.log(`[FundamentalsService] Fetching fundamental metrics for ${symbol}`);
  
  try {
    const fundamentalMetrics = await fetchPolygonFundamentalMetrics(symbol);
    
    if (fundamentalMetrics && fundamentalMetrics.length > 0) {
      console.log(`[FundamentalsService] Fundamental metrics found for ${symbol}: ${fundamentalMetrics.length} periods`);
      return fundamentalMetrics;
    } else {
      console.log(`[FundamentalsService] No fundamental metrics found for ${symbol}`);
      return [];
    }
  } catch (error) {
    console.error(`[FundamentalsService] Error fetching fundamental metrics for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Combines dividend and fundamental data into a single metrics object
 * @param {string} symbol - The stock symbol
 * @param {number} currentPrice - Current stock price
 * @returns {Promise<object>} - Combined financial metrics
 */
export async function fetchAllFinancialMetrics(symbol, currentPrice) {
  console.log(`[FundamentalsService] Fetching all financial metrics for ${symbol}`);
  
  try {
    const [dividendData, fundamentalMetrics] = await Promise.all([
      fetchDividendData(symbol, currentPrice),
      fetchFundamentalMetrics(symbol)
    ]);

    const result = {
      dividends: dividendData,
      fundamentals: fundamentalMetrics,
      source: 'Polygon.io'
    };

    console.log(`[FundamentalsService] Combined metrics for ${symbol}:`, {
      hasDividends: !!dividendData.dividendYield,
      fundamentalPeriods: fundamentalMetrics.length
    });

    return result;
  } catch (error) {
    console.error(`[FundamentalsService] Error fetching combined metrics for ${symbol}:`, error.message);
    return {
      dividends: { dividendYield: null, annualDividendAmount: null },
      fundamentals: [],
      source: 'Error',
      error: error.message
    };
  }
}
