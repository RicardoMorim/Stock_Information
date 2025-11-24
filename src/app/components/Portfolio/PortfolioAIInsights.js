'use client';

import { useState, useEffect, useRef } from 'react';
import { SparklesIcon, BriefcaseIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * PortfolioAIInsights Component
 * Displays AI-powered portfolio analysis with streaming support
 */
export default function PortfolioAIInsights() {
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
      // Get authentication token from localStorage
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/ai/analyze-portfolio', { headers });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to analyze your portfolio');
        } else if (response.status === 404) {
          throw new Error('No portfolio found. Add some stocks first!');
        }
        throw new Error(`Failed to fetch analysis: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setIsAnalyzing(false);
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle regular content chunks
              if (data.chunk !== undefined) {
                setAnalysis(prev => prev + data.chunk);
                if (data.model && data.provider) {
                  setModelInfo({ model: data.model, provider: data.provider });
                }
              }
              // Handle error chunks
              else if (data.error) {
                setError(data.error);
                setIsAnalyzing(false);
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error('Portfolio analysis error:', err);
      setError(err.message || 'An error occurred during analysis');
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
          <SparklesIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            AI Portfolio Analysis
          </h2>
          {modelInfo && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
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
          Get comprehensive AI-powered portfolio analysis including diversification assessment,
          risk analysis, rebalancing recommendations, and personalized investment advice.
        </p>
      )}

      {/* Analyze Button */}
      {!isAnalyzing && !analysis && !error && (
        <button
          onClick={startAnalysis}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
        >
          <BriefcaseIcon className="h-5 w-5" />
          <span>Analyze My Portfolio with AI</span>
        </button>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">AI is analyzing your portfolio...</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1 rounded-full animate-pulse"></div>
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
          className={`prose prose-sm dark:prose-invert max-w-none overflow-y-auto transition-all duration-300 ${isExpanded ? 'max-h-[800px]' : 'max-h-[400px]'
            }`}
        >
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div
              className="markdown-content text-gray-900 dark:text-gray-100"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(analysis) }}
            />

            {isAnalyzing && (
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
            )}
          </div>
        </div>
      )}

      {/* Retry Button After Analysis */}
      {!isAnalyzing && analysis && (
        <div className="mt-4">
          <button
            onClick={startAnalysis}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium flex items-center space-x-1"
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

      {/* Tips */}
      {!analysis && !error && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            💡 What you&apos;ll get:
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Diversification and sector allocation analysis</li>
            <li>• Risk assessment and concentration warnings</li>
            <li>• Performance evaluation of individual holdings</li>
            <li>• Specific rebalancing recommendations</li>
            <li>• Market context and positioning advice</li>
          </ul>
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
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-blue-700 dark:text-blue-300">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-blue-800 dark:text-blue-200">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-blue-900 dark:text-blue-100">$1</h1>');

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