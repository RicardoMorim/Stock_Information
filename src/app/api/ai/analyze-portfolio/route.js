/**
 * API Route: AI Portfolio Analysis
 * Provides comprehensive AI-powered portfolio analysis with streaming support
 */
import { NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/app/utils/serverAuthUtils';
import { streamAI } from '@/app/services/aiService';
import connectDB from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';
import { fetchSnapshotWithFallback } from '@/app/services/stockDataService';
import { fetchNewsWithFallback } from '@/app/services/newsService';
import { fetchHistoricalDataWithFallback } from '@/app/services/historicalDataService';
import { fetchAllFinancialMetrics } from '@/app/services/fundamentalsService';
import { getFearGreedIndex, interpretFearGreed } from '@/app/utils/fearGreedService';
import { aggregatePortfolioHoldings, calculatePortfolioSummary, processHoldingsWithMarketData } from '../../portfolio/route';
import { fetchStockPrices, getExchangeRates } from '@/app/utils/portfolioUtils';
import { analyzePricePatternWithAI, getFallbackPattern } from '@/app/services/PriceMovementAIHelper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get detailed stock data including historical trends and technical indicators
 */
async function getDetailedStockData(symbol, currentPriceEUR) {
  try {
    // Fetch historical data
    const historicalResult = await fetchHistoricalDataWithFallback(symbol);
    const historicalData = historicalResult?.data || [];

    // Calculate technical indicators
    const technicalIndicators = calculateTechnicalIndicators(historicalData, currentPriceEUR);
    const historicalTrends = extractHistoricalTrends(historicalData, currentPriceEUR);

    // Fetch news
    const news = await fetchNewsWithFallback(symbol);
    const newsSentiment = analyzeNewsSentiment(news);

    // Fetch financial metrics
    let financialMetrics = null;
    try {
      financialMetrics = await fetchAllFinancialMetrics(symbol, currentPriceEUR);
    } catch (error) {
      console.warn(`[FinancialMetrics] Error fetching metrics for ${symbol}:`, error.message);
    }

    return {
      symbol,
      technicalIndicators,
      historicalTrends,
      news: {
        recentHeadlines: news.slice(0, 5).map(n => ({
          headline: n.headline || n.title,
          source: n.source_name || n.source || 'Unknown',
          url: n.url || '#'
        })),
        sentiment: newsSentiment
      },
      financialMetrics: financialMetrics ? {
        dividendYield: financialMetrics.dividends?.dividendYield || null,
        fundamentals: financialMetrics.fundamentals?.slice(0, 2) || []
      } : null
    };
  } catch (error) {
    console.error(`[DetailedStockData] Error for ${symbol}:`, error);
    return {
      symbol,
      technicalIndicators: null,
      historicalTrends: null,
      news: {
        recentHeadlines: [],
        sentiment: { overall: 'neutral', positiveCount: 0, negativeCount: 0 }
      },
      financialMetrics: null,
      error: error.message
    };
  }
}

/**
 * Calculate technical indicators from historical data
 */
function calculateTechnicalIndicators(historicalData, currentPrice) {
  if (!historicalData || historicalData.length === 0) return null;

  try {
    const prices = historicalData.map(d => d.c || d.close).filter(p => p !== null && !isNaN(p));
    if (prices.length < 10) return null;

    const actualCurrentPrice = currentPrice || prices[prices.length - 1];

    // Calculate SMAs
    const sma20 = prices.length >= 20 ? prices.slice(-20).reduce((a, b) => a + b, 0) / 20 : null;
    const sma50 = prices.length >= 50 ? prices.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;

    // Determine trends
    const trends = {
      shortTerm: sma20 ? (actualCurrentPrice > sma20 ? 'bullish' : 'bearish') : 'neutral',
      mediumTerm: sma50 ? (actualCurrentPrice > sma50 ? 'bullish' : 'bearish') : 'neutral'
    };

    return {
      currentPrice: actualCurrentPrice,
      sma20,
      sma50,
      trends
    };
  } catch (error) {
    console.error('[TechnicalIndicators] Error:', error);
    return null;
  }
}

/**
 * Extract historical trends
 */
async function extractHistoricalTrends(historicalData, currentPrice, symbol = 'STOCK') {
    if (!historicalData || historicalData.length === 0) {
        return {
            trend: 'insufficient data',
            volatility: 'low',
            pattern: 'unknown',
            summary: 'No historical data available'
        };
    }

    try {
        const prices = historicalData.map(d => d.c || d.close).filter(p => p !== null && !isNaN(p));
        if (prices.length < 30) {
            return {
                trend: 'limited data',
                volatility: 'unknown',
                pattern: 'unknown',
                summary: 'Limited historical data available'
            };
        }

        // Calculate price change
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

        // Determine trend
        let trend = 'neutral';
        if (priceChange > 10) trend = 'strong uptrend';
        else if (priceChange > 3) trend = 'moderate uptrend';
        else if (priceChange < -10) trend = 'strong downtrend';
        else if (priceChange < -3) trend = 'moderate downtrend';

        // Calculate volatility
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }

        const volatility = calculateStandardDeviation(returns) * Math.sqrt(252) * 100;
        let volatilityLevel = 'low';
        if (volatility > 40) volatilityLevel = 'very high';
        else if (volatility > 30) volatilityLevel = 'high';
        else if (volatility > 20) volatilityLevel = 'moderate';

        // Get AI-powered pattern analysis (with timeout to prevent blocking)
        let pattern = 'price movement pattern';
        try {
            const patternPromise = analyzePricePatternWithAI(symbol, prices.slice(-30), trend, volatility, priceChange);
            // Set a 2-second timeout for AI response
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Pattern analysis timeout')), 2000)
            );

            pattern = await Promise.race([patternPromise, timeoutPromise]);
        } catch (aiError) {
            console.warn('[HistoricalTrends] AI pattern analysis timed out or failed, using fallback:', aiError.message);
            pattern = getFallbackPattern(trend, volatility, priceChange);
        }

        // Create comprehensive summary
        return {
            trend,
            volatility: volatilityLevel,
            volatilityPercent: volatility,
            pattern,
            priceChangePercent: priceChange,
            summary: `${trend} with ${volatilityLevel} volatility. Pattern: ${pattern}.`
        };
    } catch (error) {
        console.error('[HistoricalTrends] Error:', error);
        return {
            trend: 'error',
            volatility: 'unknown',
            pattern: 'unknown',
            summary: 'Error analyzing historical trends'
        };
    }
}
/**
 * Calculate standard deviation
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
 */
function analyzeNewsSentiment(newsArticles) {
  if (!newsArticles || newsArticles.length === 0) {
    return { overall: 'neutral', positiveCount: 0, negativeCount: 0 };
  }

  // Simple keyword-based sentiment analysis
  const positiveKeywords = ['up', 'surge', 'growth', 'profit', 'beat', 'strong', 'bull', 'rise', 'gain'];
  const negativeKeywords = ['down', 'fall', 'drop', 'loss', 'miss', 'weak', 'bear', 'risk', 'decline'];

  let positiveCount = 0;
  let negativeCount = 0;

  newsArticles.forEach(article => {
    const text = (article.headline || article.title || '') + ' ' + (article.summary || article.text || '');
    const lowerText = text.toLowerCase();

    const hasPositive = positiveKeywords.some(kw => lowerText.includes(kw));
    const hasNegative = negativeKeywords.some(kw => lowerText.includes(kw));

    if (hasPositive && !hasNegative) positiveCount++;
    if (hasNegative && !hasPositive) negativeCount++;
  });

  let overall = 'neutral';
  if (positiveCount > negativeCount * 1.5) overall = 'positive';
  if (negativeCount > positiveCount * 1.5) overall = 'negative';

  return { overall, positiveCount, negativeCount };
}

export async function GET(request) {
  try {
    // Authenticate user
    let userId;
    try {
      userId = await getUserIdFromToken(request);
    } catch (error) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    console.log(`[AI Portfolio Analysis] Starting analysis for user ${userId}`);

    // Connect to database
    await connectDB();

    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Fetch user's portfolio
    const holdingsBySymbol = aggregatePortfolioHoldings(portfolio);
    if (!holdingsBySymbol || Object.keys(holdingsBySymbol).length === 0) {
      return NextResponse.json(
        { error: 'No portfolio found or portfolio is empty' },
        { status: 404 }
      );
    }

    const symbols = Object.keys(holdingsBySymbol);
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'No valid holdings found' },
        { status: 404 }
      );
    }

    // Parallel fetch of prices and exchange rates
    const [prices, exchangeRates] = await Promise.all([
      fetchStockPrices(symbols),
      getExchangeRates()
    ]);

    const aggregatedHoldings = processHoldingsWithMarketData(holdingsBySymbol, prices, exchangeRates);
    const summary = calculatePortfolioSummary(aggregatedHoldings);

    // Fetch market sentiment
    let marketSentiment = null;
    try {
      const fearGreed = await getFearGreedIndex();
      marketSentiment = {
        fearGreedIndex: fearGreed,
        interpretation: interpretFearGreed(fearGreed.value),
      };
    } catch (error) {
      console.error('[AI Portfolio Analysis] Error fetching market sentiment:', error);
      marketSentiment = {
        fearGreedIndex: { value: 'N/A', valueText: 'N/A' },
        interpretation: 'Unable to determine market sentiment'
      };
    }

    // Fetch detailed data for each holding in sequence to avoid rate limiting
    const detailedHoldings = [];
    const failedSymbols = [];

    for (const holding of aggregatedHoldings) {
      try {
        console.log(`[AI Portfolio Analysis] Fetching detailed data for ${holding.symbol}`);
        const detailedData = await getDetailedStockData(holding.symbol, holding.currentPriceInEUR);
        detailedHoldings.push({
          ...holding,
          ...detailedData
        });
        console.log(`[AI Portfolio Analysis] ✓ Successfully processed ${holding.symbol}`);
      } catch (error) {
        console.error(`[AI Portfolio Analysis] ✗ Error processing ${holding.symbol}:`, error);
        failedSymbols.push(holding.symbol);
        detailedHoldings.push({
          ...holding,
          news: {
            recentHeadlines: await fetchNewsWithFallback(holding.symbol),
            sentiment: { overall: 'neutral', positiveCount: 0, negativeCount: 0 }
          },
          error: error.message
        });
      }
    }

    // Prepare AI prompt with comprehensive context
    const systemPrompt = `You are an expert portfolio manager and financial advisor with deep expertise in portfolio construction, risk management, and investment strategy.
Analyze the provided portfolio comprehensively. You will receive portfolio-level metrics and detailed data for each individual stock. Integrate the individual stock analysis into your overall assessment of the portfolio's health, risks, and opportunities.
Structure your response with these sections:
## 📊 Portfolio Overview
Provide a high-level summary of the portfolio (2-3 sentences).
## 💼 Holdings Analysis
- **Overall:** Analyze the quality of the individual holdings based on the detailed data provided (technicals, fundamentals, sentiment).
- **Top Holdings:** Discuss the top holdings and their influence on the portfolio.
- **Performance:** Comment on individual stock performance (gain/loss) in the context of their fundamentals and market sentiment.
## 🎯 Diversification & Risk
- **Sector Allocation:** Assess the balance and concentration in different sectors.
- **Concentration Risk:** Evaluate the risk from over-concentration in the top holdings.
- **Individual Stock Risks:** Highlight key risks for specific stocks based on their detailed analysis (e.g., poor technicals, weak fundamentals, negative sentiment).
## 📈 Performance & Recommendations
- **Overall Performance:** Summarize the portfolio's total performance.
- **Rebalancing:** Provide specific, actionable recommendations. Justify why a stock should be bought, sold, or held by referencing the detailed data provided.
- **Priority Actions:** List the most important actions the user should consider.
## 🌍 Market Context
- **Current Environment:** Use the Fear & Greed Index to describe the market mood.
- **Positioning:** How is the portfolio positioned for the current market conditions?
Be specific, data-driven, and provide actionable recommendations. Use clear formatting with headers, bullet points, and emphasis.`;

    const userPrompt = buildUserPrompt(summary, detailedHoldings, marketSentiment, failedSymbols);

    console.log("[AI Portfolio Analysis] Prompts prepared, initiating AI streaming response");

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = streamAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]);
          for await (const { chunk, model, provider } of aiStream) {
            const payload = `data: ${JSON.stringify({ chunk, model, provider })}\n\n`;
            controller.enqueue(encoder.encode(payload));
          }
          controller.close();
        } catch (streamError) {
          console.error('[AI Stream Error]', streamError);
          const errorPayload = `data: ${JSON.stringify({ error: 'Error during AI stream' })}\n\n`;
          controller.enqueue(encoder.encode(errorPayload));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[AI Portfolio Analysis] Top-level error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during portfolio analysis: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Build user prompt with comprehensive portfolio data
 */
function buildUserPrompt(summary, detailedHoldings, marketSentiment, failedSymbols) {
  console.debug('[AI Portfolio Analysis] Building user prompt with summary and detailed holdings');
  console.debug('Portfolio Summary:', JSON.stringify(summary, null, 2));
  console.debug('NO FINANCIAL METRICS TODO Detailed Holdings:', JSON.stringify(detailedHoldings, null, 2));
  console.debug('Market Sentiment:', JSON.stringify(marketSentiment, null, 2));
  console.debug('Failed Symbols:', JSON.stringify(failedSymbols, null, 2));

  const holdingsSummary = detailedHoldings
    .sort((a, b) => b.currentValueEUR - a.currentValueEUR)
    .map(h => `${h.symbol}: ${(h.percentageReturn * 100).toFixed(1)}% | €${h.totalProfitLossInEUR.toFixed(1)} | Current value: €${h.currentTotalValueInEUR.toFixed(2)} | Total invested: €${h.totalInvestmentInEUR.toFixed(2)}`)
    .join(', ');


  const userPrompt = `Analyze this investment portfolio comprehensively:
**Portfolio Summary:**
- Total Holdings: ${detailedHoldings.length}
- Total Value: €${summary.currentTotalValueInEUR.toFixed(2)}
- Total Gain/Loss: €${(summary.totalProfitLossInEUR).toFixed(2)} (${summary.percentageReturn.toFixed(2)}%)
- Total Investment: ${summary.totalInvestmentInEUR.toFixed(2)} EUR
- Top Holdings: ${holdingsSummary}

**Market Context:**
- Fear & Greed Index: ${marketSentiment.fearGreedIndex.value} (${marketSentiment.fearGreedIndex.valueText})
- Market Interpretation: ${marketSentiment.interpretation}

**Individual Holdings Analysis:**
${JSON.stringify(detailedHoldings, null, 2)}

${failedSymbols.length > 0 ? `
**Note:** Limited data available for: ${failedSymbols.join(', ')}. Analysis based on available information only.
` : ''}

Provide comprehensive portfolio analysis with clear, actionable recommendations.`;

  console.log('[AI Portfolio Analysis] User prompt built successfully');
  console.log('User Prompt:', userPrompt);
  return userPrompt;
}