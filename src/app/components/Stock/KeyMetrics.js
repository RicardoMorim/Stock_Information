"use client";

// Helper function to calculate financial ratios
const calculateFinancialRatios = (incomeStatement, balanceSheet, currentPrice) => {
    if (!incomeStatement || !balanceSheet) {
        return {};
    }

    const netIncome = incomeStatement.net_income_loss?.value || 0;
    const totalAssets = balanceSheet.assets?.value || 0;
    const equity = balanceSheet.equity?.value || 0;
    const totalLiabilities = balanceSheet.liabilities?.value || 0;
    const revenue = incomeStatement.revenues?.value || 0;
    const ebit = incomeStatement.operating_income_loss?.value || 0;
    const sharesOutstanding = incomeStatement.diluted_average_shares?.value || incomeStatement.basic_average_shares?.value || 0;
    const dilutedEPS = incomeStatement.diluted_earnings_per_share?.value;

    const ratios = {
        ROA: totalAssets !== 0 ? (netIncome / totalAssets) * 100 : null,
        ROE: equity !== 0 ? (netIncome / equity) * 100 : null,
        EPS: dilutedEPS !== undefined ? dilutedEPS : (sharesOutstanding !== 0 ? netIncome / sharesOutstanding : null),
        debtToEquity: equity !== 0 ? (totalLiabilities / equity) * 100 : null,
        profitMargin: revenue !== 0 ? (netIncome / revenue) * 100 : null,
        operatingMargin: revenue !== 0 ? (ebit / revenue) * 100 : null,
        revenuePerShare: sharesOutstanding !== 0 ? revenue / sharesOutstanding : null,
        bookValuePerShare: sharesOutstanding !== 0 ? equity / sharesOutstanding : null,
        priceToEarnings: dilutedEPS !== undefined && dilutedEPS !== 0 && currentPrice ? currentPrice / dilutedEPS : null,
        priceToBook: sharesOutstanding !== 0 && equity !== 0 && currentPrice ? currentPrice / (equity / sharesOutstanding) : null,
        priceToSales: sharesOutstanding !== 0 && revenue !== 0 && currentPrice ? currentPrice / (revenue / sharesOutstanding) : null,
        marketCap: incomeStatement.market_capitalization?.value || null, // Direct from Polygon if available
        enterpriseValue: incomeStatement.enterprise_value?.value || null, // Direct from Polygon if available
    };
    return ratios;
};

const KeyMetrics = ({ metrics }) => {
    const latestFinancials = metrics.fundamentals?.latestFinancials;
    const incomeStatement = latestFinancials?.income;
    const balanceSheet = latestFinancials?.balance;
    const companyInfo = latestFinancials?.companyInfo; 

    const calculatedRatios = calculateFinancialRatios(incomeStatement, balanceSheet, metrics.price);

    const displayMetrics = [
        { label: "Price", value: metrics.price, format: (v) => v !== null && v !== undefined ? `$${Number(v).toFixed(2)}` : "N/A" },
        { label: "High (Today)", value: metrics.high, format: (v) => v !== null && v !== undefined ? `$${Number(v).toFixed(2)}` : "N/A" },
        { label: "Low (Today)", value: metrics.low, format: (v) => v !== null && v !== undefined ? `$${Number(v).toFixed(2)}` : "N/A" },
        { label: "Open (Today)", value: metrics.open, format: (v) => v !== null && v !== undefined ? `$${Number(v).toFixed(2)}` : "N/A" },
        { label: "Prev. Close", value: metrics.previousClose, format: (v) => v !== null && v !== undefined ? `$${Number(v).toFixed(2)}` : "N/A" },
        { label: "Volume", value: metrics.volume, format: (v) => v !== null && v !== undefined ? Number(v).toLocaleString() : "N/A" },
        { label: "VWAP", value: metrics.vwap, format: (v) => v !== null && v !== undefined ? `$${Number(v).toFixed(2)}` : "N/A" },
        
        { 
            label: "Market Cap", 
            value: companyInfo?.market_capitalization || calculatedRatios.marketCap,
            format: (v) => v ? `$${Number(v).toLocaleString()}` : "N/A"
        },
        { 
            label: "P/E Ratio", 
            value: calculatedRatios.priceToEarnings,
            format: (v) => v ? Number(v).toFixed(2) : "N/A"
        },
        { 
            label: "EPS (Diluted)", 
            value: calculatedRatios.EPS,
            format: (v) => v ? `$${Number(v).toFixed(2)}` : "N/A"
        },
        { 
            label: "Dividend Yield", 
            value: metrics.dividendInfo?.yield, 
            format: (v) => v ? `${Number(v).toFixed(2)}%` : "N/A" 
        },
        { 
            label: "Annual Dividend", 
            value: metrics.dividendInfo?.annualAmount, 
            format: (v) => v ? `$${Number(v).toFixed(2)}` : "N/A" 
        },
        { 
            label: "Revenue (Latest Filing)", 
            value: incomeStatement?.revenues?.value, 
            format: (v) => v ? `$${Number(v).toLocaleString()}`: "N/A"
        },
        { 
            label: "Net Income (Latest Filing)", 
            value: incomeStatement?.net_income_loss?.value, 
            format: (v) => v ? `$${Number(v).toLocaleString()}` : "N/A"
        },
        { 
            label: "Profit Margin", 
            value: calculatedRatios.profitMargin,
            format: (v) => v ? `${Number(v).toFixed(2)}%` : "N/A"
        },
        { 
            label: "Operating Margin", 
            value: calculatedRatios.operatingMargin,
            format: (v) => v ? `${Number(v).toFixed(2)}%` : "N/A"
        },
        { 
            label: "ROA (Return on Assets)", 
            value: calculatedRatios.ROA,
            format: (v) => v ? `${Number(v).toFixed(2)}%` : "N/A"
        },
        { 
            label: "ROE (Return on Equity)", 
            value: calculatedRatios.ROE,
            format: (v) => v ? `${Number(v).toFixed(2)}%` : "N/A"
        },
        { 
            label: "Debt/Equity", 
            value: calculatedRatios.debtToEquity,
            format: (v) => v ? Number(v).toFixed(2) : "N/A"
        },
        { 
            label: "Book Value/Share", 
            value: calculatedRatios.bookValuePerShare,
            format: (v) => v ? `$${Number(v).toFixed(2)}` : "N/A"
        },
        { 
            label: "Price/Book (P/B)", 
            value: calculatedRatios.priceToBook,
            format: (v) => v ? Number(v).toFixed(2) : "N/A"
        },
        { 
            label: "Price/Sales (P/S)", 
            value: calculatedRatios.priceToSales,
            format: (v) => v ? Number(v).toFixed(2) : "N/A"
        },
        { 
            label: "Enterprise Value", 
            value: companyInfo?.enterprise_value || calculatedRatios.enterpriseValue,
            format: (v) => v ? `$${Number(v).toLocaleString()}` : "N/A"
        },
    ];
    
    return (
        <div className="mt-8 p-4 md:p-6 bg-gray-800 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Key Metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                {displayMetrics.map((metric) => {
                    // Check if value is not undefined, not null. For numbers, also check if not NaN.
                    // Allow explicit "N/A" string for values that are intentionally set as such.
                    const isValuePresent = metric.value !== undefined && metric.value !== null && (typeof metric.value === 'string' || !isNaN(metric.value));
                    
                    return isValuePresent ? (
                        <div key={metric.label} className="bg-gray-700 p-4 rounded-lg shadow-md">
                            <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
                            <p className="text-lg md:text-xl font-semibold text-white">
                                {metric.format ? metric.format(metric.value) : metric.value}
                            </p>
                        </div>
                    ) : null;
                })}
            </div>
             {(!latestFinancials || Object.keys(latestFinancials).length === 0) && (
                <p className="text-gray-400 mt-4">Detailed financial data not available for this asset.</p>
            )}
        </div>
    );
};

export default KeyMetrics;
