/**
 * API Route: AI Stock Analysis
 * Provides comprehensive AI-powered stock analysis with streaming support
 */

import { NextResponse } from 'next/server';
import { aggregateStockData } from '@/app/services/aiDataAggregator';
import { streamAI } from '@/app/services/aiService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/analyze-stock/[symbol]
 * Stream AI analysis for a specific stock
 */
export async function GET(request, { params }) {
  const { symbol } = params;
  
  if (!symbol) {
    return NextResponse.json(
      { error: 'Stock symbol is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[AI Stock Analysis] Starting analysis for ${symbol}`);

    // Aggregate comprehensive stock data
    const stockData = await aggregateStockData(symbol.toUpperCase());

    if (!stockData || !stockData.currentPrice) {
      return NextResponse.json(
        { error: `No data available for symbol: ${symbol}` },
        { status: 404 }
      );
    }

    // Prepare AI prompt with comprehensive context
    const systemPrompt = `You are an expert financial analyst with deep knowledge of stock markets, technical analysis, and fundamental analysis.

Analyze the provided stock data comprehensively and structure your response with these sections:

## 📊 Executive Summary
Provide a concise overview of the stock's current situation (2-3 sentences).

## 📈 Technical Analysis
- Current price trends (short, medium, long-term)
- Key technical indicators (SMA, RSI, volume trends)
- Support and resistance levels
- Technical outlook

## 💼 Fundamental Analysis
- Company fundamentals and financial metrics
- Dividend information (if applicable)
- Valuation assessment
- Financial health

## 📰 News & Sentiment Analysis
- Recent news summary and key headlines
- Market sentiment interpretation
- How news may impact the stock

## 🌍 Market Context
- Current Fear & Greed Index interpretation
- Broader market conditions
- Sector trends (if relevant)

## ⚠️ Risk Assessment
- Key risks to consider
- Volatility analysis
- Risk/reward profile

## 🎯 Investment Recommendations
- Clear buy/hold/sell perspective with reasoning
- Price targets or entry/exit points
- Position sizing suggestions
- Time horizon considerations

Be specific, cite the data provided, and provide actionable insights. Use clear formatting with headers, bullet points, and emphasis.`;

    const userPrompt = `Analyze this stock comprehensively:

**Symbol:** ${stockData.symbol}
**Name:** ${stockData.name}
**Exchange:** ${stockData.exchange}
**Type:** ${stockData.type}

**Current Price Data:**
- Current Price: $${stockData.currentPrice?.toFixed(2) || 'N/A'}
- Daily Change: ${stockData.dailyChange?.toFixed(2) || 'N/A'}%
- Daily High: $${stockData.dailyHigh?.toFixed(2) || 'N/A'}
- Daily Low: $${stockData.dailyLow?.toFixed(2) || 'N/A'}
- Volume: ${stockData.dailyVolume?.toLocaleString() || 'N/A'}
- Previous Close: $${stockData.previousClose?.toFixed(2) || 'N/A'}

**Technical Indicators:**
${stockData.technicalIndicators ? `
- SMA 20: $${stockData.technicalIndicators.sma20?.toFixed(2) || 'N/A'}
- SMA 50: $${stockData.technicalIndicators.sma50?.toFixed(2) || 'N/A'}
- SMA 200: $${stockData.technicalIndicators.sma200?.toFixed(2) || 'N/A'}
- RSI (14): ${stockData.technicalIndicators.rsi?.toFixed(2) || 'N/A'}
- Volatility (Annualized): ${stockData.technicalIndicators.volatility?.toFixed(2) || 'N/A'}%
- Volume vs Average: ${stockData.technicalIndicators.volume?.trend?.toFixed(2) || 'N/A'}%
- Trends: Short-term ${stockData.technicalIndicators.trends?.shortTerm || 'N/A'}, Medium-term ${stockData.technicalIndicators.trends?.mediumTerm || 'N/A'}, Long-term ${stockData.technicalIndicators.trends?.longTerm || 'N/A'}
- Price Changes: 1D: ${stockData.technicalIndicators.priceChanges?.['1Day']?.toFixed(2) || 'N/A'}%, 7D: ${stockData.technicalIndicators.priceChanges?.['7Day']?.toFixed(2) || 'N/A'}%, 30D: ${stockData.technicalIndicators.priceChanges?.['30Day']?.toFixed(2) || 'N/A'}%, 1Y: ${stockData.technicalIndicators.priceChanges?.['1Year']?.toFixed(2) || 'N/A'}%
` : 'Technical indicators not available'}

**Financial Metrics:**
${stockData.financialMetrics ? `
- Dividend Yield: ${stockData.financialMetrics.dividendYield?.toFixed(2) || 'N/A'}%
- Annual Dividend: $${stockData.financialMetrics.annualDividend?.toFixed(2) || 'N/A'}
- Recent Fundamentals: ${stockData.financialMetrics.fundamentals?.length || 0} quarters available
${stockData.financialMetrics.fundamentals?.map((f, i) => `  Quarter ${i + 1}: ${JSON.stringify(f, null, 2)}`).join('\n') || ''}
` : 'Financial metrics not available'}

**News & Sentiment:**
- Total Articles: ${stockData.news?.sentiment?.totalArticles || 0}
- Sentiment: ${stockData.news?.sentiment?.overall || 'neutral'} (Positive: ${stockData.news?.sentiment?.positiveCount || 0}, Negative: ${stockData.news?.sentiment?.negativeCount || 0}, Neutral: ${stockData.news?.sentiment?.neutralCount || 0})
- Recent Headlines:
${stockData.news?.sentiment?.recentHeadlines?.map(h => `  - "${h.headline}" (${h.source}, ${new Date(h.publishedAt).toLocaleDateString()})`).join('\n') || 'No recent headlines'}

**Market Sentiment:**
- Fear & Greed Index: ${stockData.marketSentiment?.fearGreedIndex?.value || 'N/A'} (${stockData.marketSentiment?.fearGreedIndex?.valueText || 'N/A'})
- Interpretation: ${stockData.marketSentiment?.interpretation || 'N/A'}
${stockData.marketSentiment?.fearGreedIndex?.previousClose ? `- Previous Close: ${stockData.marketSentiment.fearGreedIndex.previousClose}` : ''}
${stockData.marketSentiment?.fearGreedIndex?.oneWeekAgo ? `- One Week Ago: ${stockData.marketSentiment.fearGreedIndex.oneWeekAgo}` : ''}
${stockData.marketSentiment?.fearGreedIndex?.oneMonthAgo ? `- One Month Ago: ${stockData.marketSentiment.fearGreedIndex.oneMonthAgo}` : ''}

**Data Quality:**
- Historical Data Points: ${stockData.historicalData?.dataPoints || 0}
- Data Source: ${stockData.dataSource || 'N/A'}
- Is Delayed: ${stockData.isDelayed ? 'Yes' : 'No'}

Provide comprehensive analysis with clear, actionable insights based on this data.`;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messages = [{ role: 'user', content: userPrompt }];
          
          // Stream AI response
          for await (const { chunk, model, provider } of streamAI(messages, {
            systemPrompt,
            temperature: 0.3,
            maxTokens: 8192,
          })) {
            // Send chunk as Server-Sent Event
            const data = JSON.stringify({
              type: 'chunk',
              content: chunk,
              model,
              provider,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send completion signal
          const doneData = JSON.stringify({
            type: 'done',
            symbol: stockData.symbol,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          
          controller.close();
        } catch (error) {
          console.error('[AI Stock Analysis] Streaming error:', error);
          
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Analysis failed',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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
    console.error(`[AI Stock Analysis] Error for ${symbol}:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to analyze stock',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
