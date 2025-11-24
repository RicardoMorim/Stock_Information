import { callAI } from '@/app/services/aiService';

// New function to analyze price patterns with AI
export async function analyzePricePatternWithAI(symbol, prices, trend, volatilityPercent, priceChangePercent) {
    try {
        const systemPrompt = `You are a financial analyst expert specializing in technical analysis of stock price patterns. Your task is to analyze the recent price movement described by the data and identify the dominant price pattern. Be concise, professional, and use proper technical terminology.
    
Respond with a single, descriptive phrase that captures the main price pattern (e.g., "ascending triangle pattern", "consolidation after uptrend", "downtrend with decreasing volatility", etc.). Keep it under 10 words.`;

        const userPrompt = `Analyze the following price data and identify the dominant price pattern:
    
Symbol: ${symbol}
Recent Price Change: ${priceChangePercent.toFixed(2)}%
Volatility: ${volatilityPercent.toFixed(2)}%
Trend: ${trend}
  
Recent price data (last 30 days, from oldest to newest):
${prices.map(p => p.toFixed(2)).join(', ')}

Provide a concise description of the price pattern.`;

        const messages = [{ role: 'user', content: userPrompt }];

        // Try faster models first for pattern analysis
        const fastModelChain = [
            {
                model: 'x-ai/grok-4.1-fast:free',
                provider: 'OpenRouter',
                temperature: 0.3,
                maxTokens: 50
            },
            {
                model: 'tngtech/deepseek-r1t2-chimera:free',
                provider: 'OpenRouter',
                temperature: 0.3,
                maxTokens: 50
            }
        ];

        for (const config of fastModelChain) {
            try {
                const result = await callAI(messages, {
                    systemPrompt,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens
                });

                if (result.text && result.text.trim().length > 0) {
                    return result.text.trim();
                }
            } catch (modelError) {
                console.warn(`[PatternAnalysis] ${config.model} failed:`, modelError.message);
                continue;
            }
        }

        // Fallback to default pattern if all models fail
        return getFallbackPattern(trend, volatilityPercent, priceChangePercent);

    } catch (error) {
        console.error('[PatternAnalysis] AI analysis failed:', error);
        return getFallbackPattern(trend, volatilityPercent, priceChangePercent);
    }
}

// Helper function for fallback patterns
export function getFallbackPattern(trend, volatilityPercent, priceChangePercent) {
    if (volatilityPercent > 30) {
        if (trend.includes('uptrend')) return 'high volatility uptrend';
        if (trend.includes('downtrend')) return 'high volatility downtrend';
        return 'high volatility consolidation';
    } else if (volatilityPercent > 15) {
        if (Math.abs(priceChangePercent) < 2) return 'moderate volatility consolidation';
        if (priceChangePercent > 0) return 'steady uptrend';
        return 'steady downtrend';
    } else {
        return 'low volatility sideways movement';
    }
}
