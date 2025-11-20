/**
 * AI Service with Multi-Model Fallback Chain
 * Supports: NVIDIA (4 models) + OpenRouter (4 free models)
 */

import OpenAI from 'openai';

// API Keys
const NVIDIA_API_KEY = process.env.NVIDIA_NIM_API_KEY;
const OPENROUTER_API_KEY = process.env.OPEN_ROUTER_KEY;

// NVIDIA Client
const nvidiaClient = new OpenAI({
  apiKey: NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// OpenRouter Client
const openRouterClient = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    "HTTP-Referer": "https://stock-analysis.app",
    "X-Title": "Stock Analysis AI",
  },
});

/**
 * Model Configuration with Fallback Chain
 * Order: NVIDIA (Primary) -> OpenRouter (Secondary, Free Tier)
 * Each NVIDIA model has unique API requirements
 */
const MODEL_CHAIN = [
  // NVIDIA Models (Primary) - Each with specific implementation
  {
    client: nvidiaClient,
    model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    provider: 'NVIDIA',
    responseField: 'content',
    maxTokens: 4096,
    nvidiaModel: true,
    modelType: 'llama', // Standard chat completions
    temperature: 0.6,
    topP: 0.95,
  },
  {
    client: nvidiaClient,
    model: 'qwen/qwen3-235b-a22b',
    provider: 'NVIDIA',
    responseField: 'content', // Also has reasoning_content
    maxTokens: 8192,
    nvidiaModel: true,
    modelType: 'qwen', // Needs chat_template_kwargs for thinking
    temperature: 0.2,
    topP: 0.7,
  },
  {
    client: nvidiaClient,
    model: 'minimaxai/minimax-m2',
    provider: 'NVIDIA',
    responseField: 'content',
    maxTokens: 8192,
    nvidiaModel: true,
    modelType: 'minimax', // Standard chat completions
    temperature: 1,
    topP: 0.95,
  },
  {
    client: nvidiaClient,
    model: 'openai/gpt-oss-120b',
    provider: 'NVIDIA',
    responseField: 'output_text', // Uses responses.create, not chat.completions
    maxTokens: 4096,
    nvidiaModel: true,
    modelType: 'oss', // Special responses API
    temperature: 1,
    topP: 1,
  },
  // OpenRouter Models (Secondary - All Free Tier)
  {
    client: openRouterClient,
    model: 'x-ai/grok-4.1-fast:free',
    provider: 'OpenRouter',
    responseField: 'content',
    maxTokens: 8192,
    supportsReasoning: true,
  },
  {
    client: openRouterClient,
    model: 'tngtech/deepseek-r1t2-chimera:free',
    provider: 'OpenRouter',
    responseField: 'content',
    maxTokens: 8192,
  },
  {
    client: openRouterClient,
    model: 'qwen/qwen3-235b-a22b:free',
    provider: 'OpenRouter',
    responseField: 'content',
    maxTokens: 8192,
  },
  {
    client: openRouterClient,
    model: 'deepseek/deepseek-chat-v3-0324:free',
    provider: 'OpenRouter',
    responseField: 'content',
    maxTokens: 8192,
  },
];

/**
 * Extract response text from different model response formats
 * @param {object} message - The message object from the completion
 * @param {string} preferredField - Preferred response field (content or reasoning_content)
 * @returns {string} - The extracted text
 */
function extractResponseText(message, preferredField = 'content') {
  // Try preferred field first
  if (preferredField === 'reasoning_content' && message.reasoning_content) {
    return message.reasoning_content;
  }
  
  // Fallback to content
  if (message.content) {
    return message.content;
  }
  
  // Try reasoning_content if content not available
  if (message.reasoning_content) {
    return message.reasoning_content;
  }
  
  return '';
}

/**
 * Call AI model with automatic fallback
 * @param {Array} messages - Chat messages array
 * @param {object} options - Additional options (temperature, maxTokens, etc.)
 * @returns {Promise<{text: string, model: string, provider: string}>}
 */
export async function callAI(messages, options = {}) {
  const {
    temperature = 0.3,
    systemPrompt = null,
  } = options;

  let lastError = null;

  // Try each model in the fallback chain
  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const config = MODEL_CHAIN[i];
    
    try {
      console.log(`[AI Service] Attempting model ${i + 1}/${MODEL_CHAIN.length}: ${config.model} (${config.provider})`);
      
      let responseText = '';

      // Handle different NVIDIA model types
      if (config.modelType === 'oss') {
        // OpenAI OSS uses responses.create, not chat.completions
        const userMessage = messages.find(m => m.role === 'user')?.content || '';
        const response = await config.client.responses.create({
          model: config.model,
          input: [systemPrompt ? `${systemPrompt}\n\n${userMessage}` : userMessage],
          max_output_tokens: options.maxTokens || config.maxTokens,
          top_p: config.topP,
          temperature: config.temperature,
          stream: false,
        });

        // Collect all response parts
        if (response.output_text) {
          responseText = response.output_text;
        } else if (response.reasoning_text) {
          responseText = response.reasoning_text + (response.output_text || '');
        }
      } else {
        // Standard chat completions API for other models
        let fullMessages;
        if (systemPrompt) {
          fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
        } else {
          fullMessages = messages;
        }

        const requestOptions = {
          model: config.model,
          messages: fullMessages,
          temperature: config.temperature || temperature,
          max_tokens: options.maxTokens || config.maxTokens,
          top_p: config.topP || 0.95,
        };

        // Add special parameters for Qwen (thinking mode)
        if (config.modelType === 'qwen') {
          requestOptions.chat_template_kwargs = { thinking: true };
        }

        // Add reasoning support for OpenRouter models
        if (config.supportsReasoning) {
          requestOptions.reasoning = { enabled: true };
        }

        const completion = await config.client.chat.completions.create(requestOptions);

        responseText = extractResponseText(
          completion.choices[0].message,
          config.responseField
        );
      }

      if (responseText && responseText.trim().length > 0) {
        console.log(`[AI Service] Success with ${config.model} (${config.provider})`);
        return {
          text: responseText,
          model: config.model,
          provider: config.provider,
        };
      } else {
        throw new Error('Empty response from model');
      }
    } catch (error) {
      console.error(`[AI Service] Failed with ${config.model} (${config.provider}):`, error.message);
      lastError = error;
      
      // Continue to next model in chain
      if (i < MODEL_CHAIN.length - 1) {
        console.log(`[AI Service] Falling back to next model...`);
        continue;
      }
    }
  }

  // All models failed
  throw new Error(`All AI models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Stream AI response with automatic fallback
 * @param {Array} messages - Chat messages array
 * @param {object} options - Additional options
 * @returns {AsyncGenerator<{chunk: string, model: string, provider: string}>}
 */
export async function* streamAI(messages, options = {}) {
  const {
    temperature = 0.3,
    systemPrompt = null,
  } = options;

  let lastError = null;
  let streamStarted = false;

  // Try each model in the fallback chain
  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const config = MODEL_CHAIN[i];
    
    try {
      console.log(`[AI Service] Streaming with model ${i + 1}/${MODEL_CHAIN.length}: ${config.model} (${config.provider})`);
      
      let stream;

      // Handle different NVIDIA model types
      if (config.modelType === 'oss') {
        // OpenAI OSS uses responses.create, not chat.completions
        const userMessage = messages.find(m => m.role === 'user')?.content || '';
        stream = await config.client.responses.create({
          model: config.model,
          input: [systemPrompt ? `${systemPrompt}\n\n${userMessage}` : userMessage],
          max_output_tokens: options.maxTokens || config.maxTokens,
          top_p: config.topP,
          temperature: config.temperature,
          stream: true,
        });

        // OSS streams both reasoning_text and output_text
        for await (const chunk of stream) {
          let content = '';
          
          // Collect reasoning text
          if (chunk.reasoning_text?.delta) {
            content += chunk.reasoning_text.delta;
          }
          
          // Collect output text
          if (chunk.output_text?.delta) {
            content += chunk.output_text.delta;
          }

          if (content) {
            streamStarted = true;
            yield {
              chunk: content,
              model: config.model,
              provider: config.provider,
            };
          }
        }
      } else {
        // Standard chat completions API for other models
        let fullMessages;
        if (systemPrompt) {
          fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
        } else {
          fullMessages = messages;
        }

        const requestOptions = {
          model: config.model,
          messages: fullMessages,
          temperature: config.temperature || temperature,
          max_tokens: options.maxTokens || config.maxTokens,
          top_p: config.topP || 0.95,
          stream: true,
        };

        // Add special parameters for Qwen (thinking mode)
        if (config.modelType === 'qwen') {
          requestOptions.chat_template_kwargs = { thinking: true };
        }

        // Add reasoning support for OpenRouter models
        if (config.supportsReasoning) {
          requestOptions.reasoning = { enabled: true };
        }

        stream = await config.client.chat.completions.create(requestOptions);

        // Stream chunks
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          let content = '';
          
          // Qwen streams both reasoning_content and content
          if (config.modelType === 'qwen') {
            if (delta?.reasoning_content) {
              content += delta.reasoning_content;
            }
            if (delta?.content) {
              content += delta.content;
            }
          } else {
            content = delta?.content || delta?.reasoning_content || '';
          }
          
          if (content) {
            streamStarted = true;
            yield {
              chunk: content,
              model: config.model,
              provider: config.provider,
            };
          }
        }
      }

      // If we successfully streamed content, we're done
      if (streamStarted) {
        console.log(`[AI Service] Streaming completed with ${config.model} (${config.provider})`);
        return;
      } else {
        throw new Error('No content streamed from model');
      }
    } catch (error) {
      console.error(`[AI Service] Streaming failed with ${config.model} (${config.provider}):`, error.message);
      lastError = error;
      
      // If stream already started, we can't fallback
      if (streamStarted) {
        throw error;
      }
      
      // Continue to next model in chain
      if (i < MODEL_CHAIN.length - 1) {
        console.log(`[AI Service] Falling back to next model for streaming...`);
        continue;
      }
    }
  }

  // All models failed
  throw new Error(`All AI models failed for streaming. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Generate stock analysis using AI
 * @param {object} stockData - Comprehensive stock data
 * @returns {Promise<{analysis: string, model: string, provider: string}>}
 */
export async function generateStockAnalysis(stockData) {
  const systemPrompt = `You are an expert financial analyst specializing in stock market analysis. 
Provide comprehensive, data-driven analysis based on the provided information. 
Structure your analysis clearly with sections for:
1. Technical Analysis
2. Fundamental Analysis
3. News & Sentiment
4. Risk Assessment
5. Key Recommendations

Be specific, actionable, and cite the data provided. Use professional financial terminology.`;

  const userPrompt = `Analyze the following stock data and provide comprehensive insights:

${JSON.stringify(stockData, null, 2)}

Provide a thorough analysis covering technical indicators, fundamentals, news sentiment, market conditions, and investment recommendations.`;

  const messages = [
    { role: 'user', content: userPrompt }
  ];

  const result = await callAI(messages, { systemPrompt, temperature: 0.3 });
  
  return {
    analysis: result.text,
    model: result.model,
    provider: result.provider,
  };
}

/**
 * Generate portfolio analysis using AI
 * @param {object} portfolioData - Comprehensive portfolio data
 * @returns {Promise<{analysis: string, model: string, provider: string}>}
 */
export async function generatePortfolioAnalysis(portfolioData) {
  const systemPrompt = `You are an expert portfolio manager and financial advisor.
Provide comprehensive portfolio analysis focusing on:
1. Diversification & Risk Analysis
2. Sector Allocation
3. Performance Metrics
4. Correlation Analysis
5. Rebalancing Recommendations
6. Risk/Return Optimization

Be specific, data-driven, and provide actionable recommendations. Consider modern portfolio theory and current market conditions.`;

  const userPrompt = `Analyze this investment portfolio and provide comprehensive insights:

${JSON.stringify(portfolioData, null, 2)}

Provide detailed analysis of portfolio composition, risk exposure, performance, and actionable recommendations for improvement.`;

  const messages = [
    { role: 'user', content: userPrompt }
  ];

  const result = await callAI(messages, { systemPrompt, temperature: 0.3 });
  
  return {
    analysis: result.text,
    model: result.model,
    provider: result.provider,
  };
}

export default {
  callAI,
  streamAI,
  generateStockAnalysis,
  generatePortfolioAnalysis,
};
