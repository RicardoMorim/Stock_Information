import { useState } from 'react';
import { TrashIcon, MinusCircleIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/app/utils/currency'; // Assuming you have this utility

export default function PortfolioTableRow({ stock, onSell, isSelling }) {
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellQuantity, setSellQuantity] = useState('');
  const [sellError, setSellError] = useState('');

  if (!stock) return null;

  const { symbol, name, quantity, current_price, total_value, purchase_price } = stock;
  const avgCost = purchase_price / quantity; // Calculate average cost if purchase_price is total cost
  const gainLoss = (current_price * quantity) - purchase_price;
  const gainLossPercent = ((current_price * quantity) / purchase_price - 1) * 100;
  const isGain = gainLoss >= 0;

  const handleOpenSellModal = () => {
    setSellQuantity(quantity.toString()); // Pre-fill with total quantity
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
    if (isNaN(qtyToSell) || qtyToSell <= 0 || qtyToSell > quantity) {
      setSellError(`Please enter a valid quantity (up to ${quantity}).`);
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
        <td className="py-4 px-3 md:px-5 text-sm md:text-base text-white text-right whitespace-nowrap">{quantity.toLocaleString()}</td>
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
                Quantity to Sell (Max: {quantity})
              </label>
              <input
                id="sellQuantity"
                type="number"
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
                placeholder={`Enter quantity (up to ${quantity})`}
                min="0.000001"
                max={quantity.toString()} // Ensure max is a string for input validation
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
