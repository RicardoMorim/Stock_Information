import Link from 'next/link';
import { formatCurrency } from '@/app/utils/currency'; // Assuming you have a currency formatter

export default function StockCard({ stock }) {
  if (!stock || !stock.symbol) return null; // Basic validation

  const { symbol, name, price, changePercent, exchangeShortName, type } = stock;
  
  // Check if price and changePercent are valid numbers before formatting
  const hasPriceData = typeof price === 'number' && !isNaN(price);
  const hasChangeData = typeof changePercent === 'number' && !isNaN(changePercent);

  const isPositiveChange = hasChangeData && changePercent >= 0;

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg p-4 md:p-6 hover:shadow-xl transition-shadow duration-200 ease-in-out flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl md:text-2xl font-semibold text-blue-400 truncate" title={name || symbol}>
            {name || symbol} {/* Display symbol if name is not available */}
          </h3>
          {exchangeShortName && (
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full uppercase tracking-wider">
              {exchangeShortName}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-1 truncate" title={symbol}>Symbol: {symbol}</p>
        {type && <p className="text-xs text-gray-500 mb-3">Type: {type}</p>}
      </div>

      <div className="mt-auto">
        {hasPriceData && (
          <div className="flex justify-between items-center mb-3">
            <p className="text-2xl md:text-3xl font-bold text-white">{formatCurrency(price)}</p>
            {hasChangeData && (
              <span
                className={`text-sm md:text-base font-medium px-2 py-1 rounded-md ${isPositiveChange ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                  }`}
              >
                {`${isPositiveChange ? '↑' : '↓'} ${Math.abs(changePercent).toFixed(2)}%`}
              </span>
            )}
          </div>
        )}
        {!hasPriceData && <div className="h-10 mb-3"></div> /* Placeholder for spacing if no price */}
        
        <Link href={`/stocks/${encodeURIComponent(symbol)}`}>
          <span className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 md:py-3 rounded-lg transition-colors duration-150 ease-in-out text-sm md:text-base">
            View Details
          </span>
        </Link>
      </div>
    </div>
  );
}
