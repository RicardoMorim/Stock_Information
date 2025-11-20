/**
 * API Route: AI Portfolio Analysis
 * Provides comprehensive AI-powered portfolio analysis with streaming support
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/app/utils/serverAuthUtils';
import Portfolio from '@/app/models/Portfolio';
import { fetchSnapshotWithFallback } from '@/app/services/stockDataService';
import { aggregatePortfolioData } from '@/app/services/aiDataAggregator';
import { streamAI } from '@/app/services/aiService';
import connectDB from '@/app/utils/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/analyze-portfolio
 * Stream AI analysis for user's portfolio
 */
export async function GET(request) {
  try {
    // Authenticate user
    const session = await getServerSession(request);
    
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[AI Portfolio Analysis] Starting analysis for user ${session.userId}`);

    // Connect to database
    await connectDB();

    // Fetch user's portfolio
    const portfolio = await Portfolio.findOne({ userId: session.userId });

    if (!portfolio || !portfolio.holdings || portfolio.holdings.length === 0) {
      return NextResponse.json(
        { error: 'No portfolio found or portfolio is empty' },
        { status: 404 }
      );
    }

    // Fetch current prices for all holdings
    console.log(`[AI Portfolio Analysis] Fetching current prices for ${portfolio.holdings.length} holdings`);
    const currentPrices = {};
    
    await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const snapshot = await fetchSnapshotWithFallback(holding.symbol);
          if (snapshot && snapshot.latestTrade?.p) {
            currentPrices[holding.symbol] = snapshot.latestTrade.p;
          }
        } catch (error) {
          console.error(`[AI Portfolio Analysis] Error fetching price for ${holding.symbol}:`, error);
        }
      })
    );

    // Aggregate comprehensive portfolio data
    const portfolioData = await aggregatePortfolioData(portfolio, currentPrices);

    if (!portfolioData) {
      return NextResponse.json(
        { error: 'Failed to aggregate portfolio data' },
        { status: 500 }
      );
    }

    // Prepare AI prompt with comprehensive context
    const systemPrompt = `You are an expert portfolio manager and financial advisor with deep expertise in portfolio construction, risk management, and investment strategy.

Analyze the provided portfolio comprehensively and structure your response with these sections:

## 📊 Portfolio Overview
Provide a high-level summary of the portfolio (2-3 sentences).

## 💼 Holdings Analysis
- Top holdings and their weights
- Position sizing analysis
- Individual stock performance

## 🎯 Diversification Assessment
- Sector allocation and balance
- Geographic diversification (if applicable)
- Asset class distribution
- Concentration risk analysis

## 📈 Performance & Risk Analysis
- Overall portfolio performance
- Risk metrics and volatility
- Correlation analysis
- Risk-adjusted returns

## ⚖️ Risk Assessment
- Key portfolio risks
- Concentration concerns
- Market exposure and beta
- Downside protection

## 🔄 Rebalancing Recommendations
- Specific stocks to add/reduce/hold
- Target allocation suggestions
- Rebalancing rationale
- Priority actions

## 🌍 Market Context
- Current market environment (Fear & Greed Index)
- How portfolio is positioned for current conditions
- Macro considerations

## 🎯 Action Items & Next Steps
- Prioritized list of recommended actions
- Timeline for implementation
- Position sizing guidance

Be specific, data-driven, and provide actionable recommendations. Use clear formatting with headers, bullet points, and emphasis.`;

    const userPrompt = `Analyze this investment portfolio comprehensively:

**Portfolio Summary:**
- Total Holdings: ${portfolioData.summary?.totalHoldings || 0}
- Total Value: €${portfolioData.summary?.totalValue?.toFixed(2) || 'N/A'}
- Total Cost: €${portfolioData.metrics?.totalCost?.toFixed(2) || 'N/A'}
- Total Gain/Loss: €${portfolioData.summary?.totalGainLoss?.toFixed(2) || 'N/A'} (${portfolioData.summary?.totalGainLossPercent?.toFixed(2) || 'N/A'}%)
- Diversification Score: ${portfolioData.summary?.diversificationScore?.toFixed(0) || 'N/A'}/100
- Top 5 Concentration: ${portfolioData.summary?.top5Concentration?.toFixed(2) || 'N/A'}%

**Individual Holdings:**
${portfolioData.holdings?.map((h, i) => `
${i + 1}. ${h.symbol}
   - Shares: ${h.shares}
   - Current Price: $${h.currentPrice?.toFixed(2) || 'N/A'}
   - Current Value: €${h.currentValue?.toFixed(2) || 'N/A'}
   - Cost Basis: €${h.costBasis?.toFixed(2) || 'N/A'}
   - Gain/Loss: €${h.gainLoss?.toFixed(2) || 'N/A'} (${h.gainLossPercent?.toFixed(2) || 'N/A'}%)
   - Portfolio Weight: ${h.weight?.toFixed(2) || 'N/A'}%
   - Trading Currency: ${h.tradingCurrency || 'N/A'}
   - Purchase Date: ${new Date(h.purchaseDate).toLocaleDateString()}
   ${h.notes ? `- Notes: ${h.notes}` : ''}
`).join('\n') || 'No holdings available'}

**Sector Allocation:**
${Object.entries(portfolioData.metrics?.sectorAllocation || {}).map(([sector, percent]) => 
  `- ${sector}: ${percent.toFixed(2)}%`
).join('\n') || 'Sector data not available'}

**Concentration Analysis:**
- Top Holding Weight: ${portfolioData.metrics?.concentration?.topHolding?.toFixed(2) || 'N/A'}%
- Top 5 Holdings: ${portfolioData.metrics?.concentration?.top5?.toFixed(2) || 'N/A'}%

**Market Sentiment:**
- Fear & Greed Index: ${portfolioData.marketSentiment?.fearGreedIndex?.value || 'N/A'} (${portfolioData.marketSentiment?.fearGreedIndex?.valueText || 'N/A'})
- Interpretation: ${portfolioData.marketSentiment?.interpretation || 'N/A'}
${portfolioData.marketSentiment?.fearGreedIndex?.previousClose ? `- Previous Close: ${portfolioData.marketSentiment.fearGreedIndex.previousClose}` : ''}
${portfolioData.marketSentiment?.fearGreedIndex?.oneWeekAgo ? `- One Week Ago: ${portfolioData.marketSentiment.fearGreedIndex.oneWeekAgo}` : ''}

Provide comprehensive portfolio analysis with clear, actionable recommendations for improvement and optimization.`;

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
            holdingsCount: portfolioData.summary?.totalHoldings || 0,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          
          controller.close();
        } catch (error) {
          console.error('[AI Portfolio Analysis] Streaming error:', error);
          
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
    console.error(`[AI Portfolio Analysis] Error:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to analyze portfolio',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
