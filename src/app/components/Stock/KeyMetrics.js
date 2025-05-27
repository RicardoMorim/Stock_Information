
"use client";

const KeyMetrics = ({ metrics }) => {
    const displayMetrics = [
        { label: "High", value: metrics.high, format: (v) => `$${Number(v).toFixed(2)}` },
        { label: "Low", value: metrics.low, format: (v) => `$${Number(v).toFixed(2)}` },
        { label: "Volume", value: metrics.volume, format: (v) => Number(v).toLocaleString() },
        { label: "VWAP", value: metrics.vwap, format: (v) => `$${Number(v).toFixed(2)}` },
        // Add more metrics from fundamentals if available and desired
        { label: "Market Cap", value: metrics.fundamentals?.market_capitalization?.value, format: (v) => `$${Number(v).toLocaleString()}` },
        { label: "P/E Ratio", value: metrics.fundamentals?.price_earnings_ratio?.value, format: (v) => Number(v).toFixed(2) },
        { label: "Dividend Yield", value: metrics.fundamentals?.dividend_yield?.value, format: (v) => `${(Number(v) * 100).toFixed(2)}%` },
        { label: "EPS", value: metrics.fundamentals?.earnings_per_share?.value, format: (v) => `$${Number(v).toFixed(2)}` },
    ];
    
    return (
        <div className="mt-8 p-4 md:p-6 bg-gray-800 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Key Metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                {displayMetrics.map((metric) => (
                    metric.value !== undefined && metric.value !== null ? (
                        <div key={metric.label} className="bg-gray-700 p-4 rounded-lg shadow-md">
                            <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
                            <p className="text-lg md:text-xl font-semibold text-white">
                                {metric.format ? metric.format(metric.value) : metric.value}
                            </p>
                        </div>
                    ) : null
                ))}
            </div>
        </div>
    );
};

export default KeyMetrics;
