import { useState } from 'react';
import { PlusCircleIcon } from '@heroicons/react/24/solid'; // Using Heroicons

export default function AddStockForm({ onAddStock, isAdding }) {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!symbol.trim() || !quantity.trim()) {
      setError('Symbol and quantity are required.');
      return;
    }
    if (isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }

    await onAddStock({ symbol: symbol.toUpperCase(), quantity: parseFloat(quantity) });
    setSymbol('');
    setQuantity('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8 md:mb-10">
      <h2 className="text-2xl font-semibold text-white mb-6 text-center md:text-left">Add New Stock</h2>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-1">
          <label htmlFor="stockSymbol" className="block text-sm font-medium text-gray-300 mb-1">
            Stock Symbol
          </label>
          <input
            id="stockSymbol"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL"
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            required
          />
        </div>
        <div className="md:col-span-1">
          <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-300 mb-1">
            Quantity
          </label>
          <input
            id="stockQuantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g., 10"
            min="0.000001" // Allow fractional shares
            step="any"
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            required
          />
        </div>
        <div className="md:col-span-1">
          <button
            type="submit"
            disabled={isAdding}
            className="w-full flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <PlusCircleIcon className={`h-5 w-5 mr-2 ${isAdding ? 'animate-spin' : ''}`} />
            {isAdding ? 'Adding...' : 'Add Stock'}
          </button>
        </div>
      </div>
    </form>
  );
}
