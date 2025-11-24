/**
 * AI Data Aggregator Service
 * Collects and formats comprehensive stock and portfolio data for AI analysis
 */

import { fetchSnapshotWithFallback } from './stockDataService';
import { fetchNewsWithFallback } from './newsService';
import { fetchAllFinancialMetrics } from './fundamentalsService';
import { fetchHistoricalDataWithFallback } from './historicalDataService';
import { getFearGreedIndex, interpretFearGreed } from '@/app/utils/fearGreedService';

/**
 * Calculate technical indicators from historical data
 * @param {Array} historicalData - Array of historical price data
 * @returns {object} - Technical indicators
 */
function calculateTechnicalIndicators(historicalData) {
  if (!historicalData || historicalData.length === 0) {
    return null;
  }

  try {
    const prices = historicalData.map(d => d.c).filter(p => p != null);
    const volumes = historicalData.map(d => d.v).filter(v => v != null);

    if (prices.length === 0) {
      return null;
    }

    // Simple Moving Averages
    const sma20 = prices.length >= 20
      ? prices.slice(-20).reduce((a, b) => a + b, 0) / 20
      : null;
    const sma50 = prices.length >= 50
      ? prices.slice(-50).reduce((a, b) => a + b, 0) / 50
      : null;
    const sma200 = prices.length >= 200
      ? prices.slice(-200).reduce((a, b) => a + b, 0) / 200
      : null;

    // Current price
    const currentPrice = prices[prices.length - 1];

    // RSI (14-day)
    const rsi = calculateRSI(prices, 14);

    // Price change percentages
    const priceChange1Day = prices.length >= 2
      ? ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100
      : null;

    const priceChange7Day = prices.length >= 7
      ? ((prices[prices.length - 1] - prices[prices.length - 8]) / prices[prices.length - 8]) * 100
      : null;

    const priceChange30Day = prices.length >= 30
      ? ((prices[prices.length - 1] - prices[prices.length - 31]) / prices[prices.length - 31]) * 100
      : null;

    const priceChange1Year = prices.length >= 252
      ? ((prices[prices.length - 1] - prices[prices.length - 253]) / prices[prices.length - 253]) * 100
      : null;

    // Volatility (standard deviation of returns)
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const volatility = calculateStandardDeviation(returns) * Math.sqrt(252) * 100; // Annualized

    // Average volume
    const avgVolume = volumes.length > 0
      ? volumes.reduce((a, b) => a + b, 0) / volumes.length
      : null;

    // Volume trend (current vs average)
    const currentVolume = volumes[volumes.length - 1];
    const volumeTrend = avgVolume && currentVolume
      ? ((currentVolume - avgVolume) / avgVolume) * 100
      : null;

    return {
      currentPrice,
      sma20,
      sma50,
      sma200,
      rsi,
      priceChanges: {
        '1Day': priceChange1Day,
        '7Day': priceChange7Day,
        '30Day': priceChange30Day,
        '1Year': priceChange1Year,
      },
      volatility,
      volume: {
        current: currentVolume,
        average: avgVolume,
        trend: volumeTrend,
      },
      trends: {
        shortTerm: currentPrice > sma20 ? 'bullish' : 'bearish',
        mediumTerm: currentPrice > sma50 ? 'bullish' : 'bearish',
        longTerm: currentPrice > sma200 ? 'bullish' : 'bearish',
      }
    };
  } catch (error) {
    console.error('[AIDataAggregator] Error calculating technical indicators:', error);
    return null;
  }
}

/**
 * Calculate RSI (Relative Strength Index)
 * @param {Array} prices - Array of prices
 * @param {number} period - RSI period (typically 14)
 * @returns {number|null} - RSI value or null
 */
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    return null;
  }

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

/**
 * Calculate standard deviation
 * @param {Array} values - Array of values
 * @returns {number} - Standard deviation
 */
function calculateStandardDeviation(values) {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Analyze news sentiment
 * @param {Array} news - Array of news articles
 * @returns {object} - Sentiment analysis
 */
function analyzeNewsSentiment(news) {
  if (!news || news.length === 0) {
    return {
      overall: 'neutral',
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      totalArticles: 0,
      recentHeadlines: [],
    };
  }

  // Simple keyword-based sentiment (can be enhanced with AI)
  const positiveKeywords = ['up', 'surge', 'gain', 'rise', 'bull', 'growth', 'profit', 'beat', 'success', 'strong', 'high', 'positive'];
  const negativeKeywords = ['down', 'fall', 'drop', 'decline', 'bear', 'loss', 'miss', 'weak', 'low', 'negative', 'crash', 'concern'];

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  news.forEach(article => {
    const text = (article.headline + ' ' + (article.summary || '')).toLowerCase();

    const hasPositive = positiveKeywords.some(keyword => text.includes(keyword));
    const hasNegative = negativeKeywords.some(keyword => text.includes(keyword));

    if (hasPositive && !hasNegative) {
      positiveCount++;
    } else if (hasNegative && !hasPositive) {
      negativeCount++;
    } else {
      neutralCount++;
    }
  });

  const totalArticles = news.length;
  let overall = 'neutral';

  if (positiveCount > negativeCount * 1.5) {
    overall = 'positive';
  } else if (negativeCount > positiveCount * 1.5) {
    overall = 'negative';
  }

  return {
    overall,
    positiveCount,
    negativeCount,
    neutralCount,
    totalArticles,
    recentHeadlines: news.slice(0, 5).map(n => ({
      headline: n.headline,
      publishedAt: n.published_at,
      source: n.source_name || n.source,
    })),
  };
}

/**
 * Aggregate comprehensive stock data for AI analysis
 * @param {string} symbol - Stock symbol
 * @param {boolean} isCrypto - Whether the symbol is a cryptocurrency
 * @returns {Promise<object>} - Comprehensive stock data
 */
export async function aggregateStockData(symbol, isCrypto = false) {
  console.log(`[AIDataAggregator] Aggregating data for ${symbol}`);

  try {
    // Fetch all data in parallel
    const [
      snapshot,
      news,
      historicalResult,
      fearGreed,
    ] = await Promise.all([
      fetchSnapshotWithFallback(symbol, isCrypto),
      fetchNewsWithFallback(symbol),
      fetchHistoricalDataWithFallback(symbol, isCrypto),
      getFearGreedIndex(),
    ]);

    // Fetch financial metrics with current price
    const currentPrice = snapshot?.latestTrade?.p || null;
    const financialMetrics = currentPrice
      ? await fetchAllFinancialMetrics(symbol, currentPrice)
      : null;

    // Calculate technical indicators
    const technicalIndicators = historicalResult?.data
      ? calculateTechnicalIndicators(historicalResult.data)
      : null;

    // Analyze news sentiment
    const newsSentiment = analyzeNewsSentiment(news);

    // Compile comprehensive data object
    const stockData = {
      symbol,
      name: snapshot?.name || symbol,
      type: snapshot?.type || 'stock',
      exchange: snapshot?.exchange || 'N/A',

      // Current snapshot
      currentPrice: currentPrice,
      dailyChange: snapshot?.dailyBar?.c && snapshot?.prevDailyBar?.c
        ? ((snapshot.dailyBar.c - snapshot.prevDailyBar.c) / snapshot.prevDailyBar.c) * 100
        : null,
      dailyHigh: snapshot?.dailyBar?.h,
      dailyLow: snapshot?.dailyBar?.l,
      dailyVolume: snapshot?.dailyBar?.v,
      previousClose: snapshot?.prevDailyBar?.c,

      // Technical indicators
      technicalIndicators,

      // Financial metrics
      financialMetrics: financialMetrics ? {
        dividendYield: financialMetrics.dividends?.dividendYield,
        annualDividend: financialMetrics.dividends?.annualDividendAmount,
        fundamentals: financialMetrics.fundamentals?.slice(0, 4), // Last 4 quarters
      } : null,

      // News & Sentiment
      news: {
        articles: news.slice(0, 10), // Top 10 articles
        sentiment: newsSentiment,
      },

      // Market sentiment
      marketSentiment: {
        fearGreedIndex: fearGreed,
        interpretation: interpretFearGreed(fearGreed.value),
      },

      // Historical data summary
      historicalData: {
        dataPoints: historicalResult?.data?.length || 0,
        source: historicalResult?.source || 'N/A',
        hasData: (historicalResult?.data?.length || 0) > 0,
      },

      // Metadata
      dataSource: snapshot?.source || 'N/A',
      isDelayed: snapshot?.isDelayed || false,
      aggregatedAt: new Date().toISOString(),
    };

    console.log(`[AIDataAggregator] Successfully aggregated data for ${symbol}`);
    return stockData;
  } catch (error) {
    console.error(`[AIDataAggregator] Error aggregating data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Calculate portfolio metrics
 * @param {Array} holdings - Array of portfolio holdings with current prices
 * @returns {object} - Portfolio metrics
 */
function calculatePortfolioMetrics(holdings) {
  if (!holdings || holdings.length === 0) {
    return null;
  }

  try {
    let totalValue = 0;
    let totalCost = 0;
    let totalGainLoss = 0;

    const sectorAllocation = {};
    const holdingsWithMetrics = [];

    holdings.forEach(holding => {
      const shares = holding.totalShares || holding.shares || 0;
      const currentPrice = holding.currentPrice || holding.currentPriceInEUR || 0;
      const avgCostPerShare = holding.avgCostPerShareInEUR || holding.costPerShare || holding.costInEUR || 0;

      const currentValue = currentPrice * shares;
      const costBasis = avgCostPerShare * shares;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis !== 0 ? (gainLoss / costBasis) * 100 : 0;

      totalValue += currentValue;
      totalCost += costBasis;
      totalGainLoss += gainLoss;

      // Sector allocation (if available)
      const sector = holding.sector || 'Unknown';
      if (!sectorAllocation[sector]) {
        sectorAllocation[sector] = 0;
      }
      sectorAllocation[sector] += currentValue;

      holdingsWithMetrics.push({
        ...holding,
        currentValue,
        costBasis,
        gainLoss,
        gainLossPercent,
        weight: 0, // Will calculate after totalValue is known
      });
    });

    // Calculate weights
    holdingsWithMetrics.forEach(h => {
      h.weight = (h.currentValue / totalValue) * 100;
    });

    // Calculate sector allocation percentages
    const sectorAllocationPercent = {};
    Object.keys(sectorAllocation).forEach(sector => {
      sectorAllocationPercent[sector] = (sectorAllocation[sector] / totalValue) * 100;
    });

    // Portfolio concentration (top 5 holdings)
    const sortedHoldings = [...holdingsWithMetrics].sort((a, b) => b.weight - a.weight);
    const top5Concentration = sortedHoldings.slice(0, 5).reduce((sum, h) => sum + h.weight, 0);

    // Diversification score (simple: more holdings = better, but not linearly)
    const diversificationScore = Math.min(100, (holdings.length / 20) * 100);

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent: (totalGainLoss / totalCost) * 100,
      holdings: holdingsWithMetrics,
      sectorAllocation: sectorAllocationPercent,
      concentration: {
        top5: top5Concentration,
        topHolding: sortedHoldings[0]?.weight || 0,
      },
      diversification: {
        score: diversificationScore,
        holdingsCount: holdings.length,
      },
    };
  } catch (error) {
    console.error('[AIDataAggregator] Error calculating portfolio metrics:', error);
    return null;
  }
}

/**
 * Aggregate comprehensive portfolio data for AI analysis
 * @param {object} portfolio - Portfolio object with holdings
 * @param {object} currentPrices - Map of symbol -> current price
 * @returns {Promise<object>} - Comprehensive portfolio data
 */
export async function aggregatePortfolioData(portfolio, currentPrices = {}) {
  console.log(`[AIDataAggregator] Aggregating portfolio data`);
  console.log(`[AIDataAggregator] Input holdings count: ${portfolio.holdings.length}`);

  try {
    // Process holdings by calculating metrics from raw data, not relying on pre-calculated fields.
    const enhancedHoldings = portfolio.holdings.map(holding => {
      const shares = holding.totalShares || 0;
      // The cost basis from the database is reliable.
      const costBasis = holding.totalInvestmentInEUR || (holding.avgCostPerShareInEUR * shares) || 0;

      // Get the latest price from the map passed into this function.
      const livePrice = currentPrices[holding.symbol];

      // NOTE: The `livePrice` is in the stock's native currency (e.g., USD).
      // A proper implementation requires currency conversion to EUR. For now, to avoid NaN,
      // we calculate 'currentValue' using the native price. This is inaccurate for non-EUR stocks
      // but prevents the AI from getting undefined/NaN values.
      const currentPrice = livePrice || holding.avgCostPerShareInEUR || 0;
      const currentValue = currentPrice * shares;

      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        symbol: holding.symbol,
        name: holding.name || holding.symbol,
        shares,
        currentPrice,
        currentValue,
        costBasis,
        gainLoss,
        gainLossPercent,
        weight: 0, // Will be calculated later
        sector: holding.sector || 'Unknown',
        tradingCurrency: holding.tradingCurrency || 'EUR',
        // Use the flattened purchaseDate property from getUserPortfolio
        purchaseDate: holding.purchaseDate || new Date(),
      };
    });

    // Debug: Show what we're working with
    console.log(`[AIDataAggregator] Enhanced holdings debug:`, enhancedHoldings.map(h => ({
      symbol: h.symbol,
      currentValue: h.currentValue,
      costBasis: h.costBasis,
      gainLoss: h.gainLoss,
      gainLossPercent: h.gainLossPercent
    })));

    // Calculate total value
    const totalValue = enhancedHoldings.reduce((sum, h) => {
      const value = h.currentValue || 0;
      console.log(`[AIDataAggregator] Adding ${h.symbol}: ${value}`);
      return sum + value;
    }, 0);

    console.log(`[AIDataAggregator] Calculated total value: ${totalValue}`);
    console.log(`[AIDataAggregator] Expected total value (from logs): 1989.60`);

    // Calculate weights
    enhancedHoldings.forEach(h => {
      h.weight = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
    });

    // Calculate total cost and gain/loss
    const totalCost = enhancedHoldings.reduce((sum, h) => sum + (h.costBasis || 0), 0);
    const totalGainLoss = enhancedHoldings.reduce((sum, h) => sum + (h.gainLoss || 0), 0);
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    console.log(`[AIDataAggregator] Final metrics:`, {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent
    });

    // Portfolio concentration
    const sortedHoldings = [...enhancedHoldings].sort((a, b) => b.weight - a.weight);
    const top5Concentration = sortedHoldings.slice(0, 5).reduce((sum, h) => sum + h.weight, 0);

    const metrics = {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      holdings: enhancedHoldings,
      sectorAllocation: { 'Unknown': 100 }, // Simplified for now
      concentration: {
        top5: top5Concentration,
        topHolding: sortedHoldings[0]?.weight || 0,
      },
      diversification: {
        score: Math.min(100, (portfolio.holdings.length / 20) * 100),
        holdingsCount: portfolio.holdings.length,
      },
    };

    // Get market sentiment
    const fearGreed = await getFearGreedIndex();

    const portfolioData = {
      userId: portfolio.userId,
      holdings: enhancedHoldings,
      metrics,
      marketSentiment: {
        fearGreedIndex: fearGreed,
        interpretation: interpretFearGreed(fearGreed.value),
      },
      summary: {
        totalHoldings: portfolio.holdings.length,
        totalValue: metrics.totalValue,
        totalCost: metrics.totalCost,
        totalGainLoss: metrics.totalGainLoss,
        totalGainLossPercent: metrics.totalGainLossPercent,
        diversificationScore: metrics.diversification.score,
        top5Concentration: metrics.concentration.top5,
      },
      aggregatedAt: new Date().toISOString(),
    };

    console.log(`[AIDataAggregator] Final portfolio data:`, {
      totalValue: portfolioData.summary.totalValue,
      holdings: portfolioData.holdings.map(h => ({ symbol: h.symbol, value: h.currentValue }))
    });

    return portfolioData;
  } catch (error) {
    console.error(`[AIDataAggregator] Error aggregating portfolio data:`, error);
    throw error;
  }
}

export default {
  aggregateStockData,
  aggregatePortfolioData,
};
