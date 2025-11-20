'use client';

import { useState, useEffect, useRef } from 'react';
import { SparklesIcon, ChartBarIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * StockAIInsights Component
 * Displays AI-powered stock analysis with streaming support
 */
export default function StockAIInsights({ symbol }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const analysisRef = useRef(null);

  // Auto-scroll to bottom as new content streams in
  useEffect(() => {
    if (analysisRef.current && isAnalyzing) {
      analysisRef.current.scrollTop = analysisRef.current.scrollHeight;
    }
  }, [analysis, isAnalyzing]);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysis('');
    setError(null);
    setIsExpanded(true);
    setModelInfo(null);

    try {
      const response = await fetch(`/api/ai/analyze-stock/${encodeURIComponent(symbol)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analysis: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'chunk') {
              setAnalysis(prev => prev + data.content);
              if (data.model && data.provider) {
                setModelInfo({ model: data.model, provider: data.provider });
              }
            } else if (data.type === 'done') {
              setIsAnalyzing(false);
            } else if (data.type === 'error') {
              setError(data.error);
              setIsAnalyzing(false);
            }
          }
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
      setIsAnalyzing(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const clearAnalysis = () => {
    setAnalysis('');
    setError(null);
    setModelInfo(null);
    setIsExpanded(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <SparklesIcon className="h-6 w-6 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            AI Stock Analysis
          </h2>
          {modelInfo && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
              {modelInfo.provider}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!isAnalyzing && analysis && (
            <>
              <button
                onClick={toggleExpand}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
              <button
                onClick={clearAnalysis}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Clear analysis"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {!analysis && !error && (
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Get comprehensive AI-powered analysis including technical indicators, fundamentals, 
          news sentiment, and investment recommendations powered by advanced language models.
        </p>
      )}

      {/* Analyze Button */}
      {!isAnalyzing && !analysis && !error && (
        <button
          onClick={startAnalysis}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
        >
          <ChartBarIcon className="h-5 w-5" />
          <span>Analyze {symbol} with AI</span>
        </button>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            <span className="text-sm font-medium">AI is analyzing {symbol}...</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200 text-sm">
            <strong>Error:</strong> {error}
          </p>
          <button
            onClick={startAnalysis}
            className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Analysis Content */}
      {analysis && (
        <div
          ref={analysisRef}
          className={`prose prose-sm dark:prose-invert max-w-none overflow-y-auto transition-all duration-300 ${
            isExpanded ? 'max-h-[800px]' : 'max-h-[400px]'
          }`}
        >
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
            <div
              className="markdown-content text-gray-900 dark:text-gray-100"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(analysis) }}
            />
            
            {isAnalyzing && (
              <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1"></span>
            )}
          </div>
        </div>
      )}

      {/* Retry Button After Analysis */}
      {!isAnalyzing && analysis && (
        <div className="mt-4">
          <button
            onClick={startAnalysis}
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 font-medium flex items-center space-x-1"
          >
            <SparklesIcon className="h-4 w-4" />
            <span>Refresh Analysis</span>
          </button>
        </div>
      )}

      {/* Model Info Footer */}
      {modelInfo && !isAnalyzing && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Powered by {modelInfo.model.split('/').pop()} ({modelInfo.provider})
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Format markdown to HTML
 * @param {string} markdown - Markdown text
 * @returns {string} - HTML string
 */
function formatMarkdown(markdown) {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-purple-700 dark:text-purple-300">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-purple-800 dark:text-purple-200">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-purple-900 dark:text-purple-100">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>');
  html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>');

  // Line breaks
  html = html.replace(/\n\n/g, '<br/><br/>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}
