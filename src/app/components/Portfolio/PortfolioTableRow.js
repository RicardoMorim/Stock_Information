import { useState } from 'react';
import { TrashIcon, MinusCircleIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/app/utils/currency'; // Assuming you have this utility

export default function PortfolioTableRow({ stock, onSell, isSelling }) {
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellQuantity, setSellQuantity] = useState('');
  const [sellError, setSellError] = useState('');

  if (!stock) return null;

  // Align with API response structure
  const { 
    symbol,
    name, // Name might not be directly in API response for aggregated holdings, ensure it's passed or handled
    totalShares: quantity, // API sends totalShares, component uses quantity
    currentPrice: current_price, // API sends currentPrice, component uses current_price
    totalValue: total_value, // API sends totalValue, component uses total_value
    avgCostPerShare: avg_cost_per_share, // API sends avgCostPerShare
    totalCost: total_cost_eur, // API sends totalCost (which is total cost in EUR)
    totalProfitLoss,
    percentageReturn
  } = stock;

  // Ensure quantity is a number before calculations, default to 0 if not
  const numQuantity = (typeof quantity === 'number' && !isNaN(quantity)) ? quantity : 0;

  // avg_cost_per_share is already the average cost in EUR from the API
  const avgCost = typeof avg_cost_per_share === 'number' ? avg_cost_per_share : 0;
  
  // gainLoss and gainLossPercent can directly use totalProfitLoss and percentageReturn from API
  const gainLoss = typeof totalProfitLoss === 'number' ? totalProfitLoss : 0;
  const gainLossPercent = typeof percentageReturn === 'number' ? percentageReturn : 0;
  const isGain = gainLoss >= 0;

  const handleOpenSellModal = () => {
    setSellQuantity(numQuantity.toString()); // Pre-fill with total quantity
    setSellError('');
    setShowSellModal(true);
  };

  const handleCloseSellModal = () => {
    setShowSellModal(false);
    setSellQuantity('');
    setSellError('');
  };

  const handleConfirmSell = async () => {
    const qtyToSell = parseFloat(sellQuantity);
    if (isNaN(qtyToSell) || qtyToSell <= 0 || qtyToSell > numQuantity) {
      setSellError(`Please enter a valid quantity (up to ${numQuantity}).`);
      return;
    }
    setSellError('');
    await onSell(symbol, qtyToSell);
    handleCloseSellModal();
  };

  return (
    <>
      <tr className="border-b border-gray-700 hover:bg-gray-750 transition-colors duration-150 ease-in-out">
        <td className="py-4 px-3 md:px-5 text-sm md:text-base text-blue-400 font-medium whitespace-nowrap">{name || symbol} ({symbol})</td>
        <td className="py-4 px-3 md:px-5 text-sm md:text-base text-white text-right whitespace-nowrap">{numQuantity.toLocaleString()}</td>
        <td className="py-4 px-3 md:px-5 text-sm md:text-base text-white text-right whitespace-nowrap">{formatCurrency(avgCost)}</td>
        <td className="py-4 px-3 md:px-5 text-sm md:text-base text-white text-right whitespace-nowrap">{formatCurrency(current_price)}</td>
        <td className="py-4 px-3 md:px-5 text-sm md:text-base text-white text-right whitespace-nowrap">{formatCurrency(total_value)}</td>
        <td className={`py-4 px-3 md:px-5 text-sm md:text-base text-right whitespace-nowrap ${isGain ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(gainLoss)} ({isGain ? '+' : ''}{gainLossPercent.toFixed(2)}%)
        </td>
        <td className="py-4 px-3 md:px-5 text-center whitespace-nowrap">
          <button
            onClick={handleOpenSellModal}
            disabled={isSelling === symbol} // Disable if this specific stock is being sold
            className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-md transition-colors"
            aria-label={`Sell ${symbol}`}
          >
            {isSelling === symbol ? (
              <MinusCircleIcon className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
            ) : (
              <TrashIcon className="h-5 w-5 md:h-6 md:w-6" />
            )}
          </button>
        </td>
      </tr>

      {/* Sell Stock Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Sell {name || symbol}</h3>
            {sellError && <p className="text-red-500 text-sm mb-3">{sellError}</p>}
            <div className="mb-4">
              <label htmlFor="sellQuantity" className="block text-sm font-medium text-gray-300 mb-1">
                Quantity to Sell (Max: {numQuantity})
              </label>
              <input
                id="sellQuantity"
                type="number"
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
                placeholder={`Enter quantity (up to ${numQuantity})`}
                min="0.000001"
                max={numQuantity.toString()} // Ensure max is a string for input validation
                step="any"
                className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseSellModal}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSell}
                disabled={isSelling === symbol}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSelling === symbol ? 'Selling...' : `Sell ${sellQuantity} Shares`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
