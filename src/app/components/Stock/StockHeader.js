"use client";

const StockHeader = ({ symbol, name, exchange, price, changePercent, type, source, isDelayed }) => {
    const isPositiveChange = changePercent >= 0;

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 p-4 md:p-6 bg-gray-800 rounded-lg shadow-xl">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">{name || symbol}</h1>
                <p className="text-md text-gray-400">
                    {symbol} ({exchange || 'N/A'}) - <span className="font-semibold">{type || 'Stock'}</span>
                </p>
                {source && isDelayed && (
                    <p className="text-xs text-yellow-400 mt-1">
                        Data from {source} (may be delayed)
                    </p>
                )}
            </div>
            <div className="mt-4 md:mt-0 text-left md:text-right">
                <p className={`text-3xl font-bold ${isPositiveChange ? 'text-green-400' : 'text-red-400'}`}>
                    ${Number(price).toFixed(2)}
                </p>
                <p className={`text-lg ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositiveChange ? '↑' : '↓'} {Math.abs(Number(changePercent)).toFixed(2)}%
                </p>
            </div>
        </div>
    );
};

export default StockHeader;
