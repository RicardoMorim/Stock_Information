import { useState } from 'react';
import { PlusCircleIcon } from '@heroicons/react/24/solid';

export default function AddStockForm({ onAddStock, isAdding }) {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPerShare, setCostPerShare] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [currency, setCurrency] = useState('USD'); // Default currency
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!symbol.trim() || !quantity.trim() || !costPerShare.trim() || !purchaseDate.trim()) {
      setError('Symbol, Quantity, Cost Per Share, and Purchase Date are required.');
      return;
    }
    if (isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }
    if (isNaN(parseFloat(costPerShare)) || parseFloat(costPerShare) <= 0) {
      setError('Cost Per Share must be a positive number.');
      return;
    }

    await onAddStock({
      symbol: symbol.toUpperCase(),
      shares: parseFloat(quantity),
      costPerShare: parseFloat(costPerShare),
      purchaseDate,
      currency,
      notes,
    });
    setSymbol('');
    setQuantity('');
    setCostPerShare('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setCurrency('USD');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8 md:mb-10">
      <h2 className="text-2xl font-semibold text-white mb-6 text-center md:text-left">Add New Stock</h2>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
        {/* Symbol Input */}
        <div className="flex flex-col">
          <label htmlFor="stockSymbol" className="block text-sm font-medium text-gray-300 mb-1">
            Stock Symbol
          </label>
          <input
            id="stockSymbol"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL or TXT.WA"
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            required
          />
        </div>
        {/* Quantity Input */}
        <div className="flex flex-col">
          <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-300 mb-1">
            Quantity
          </label>
          <input
            id="stockQuantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g., 10"
            min="0.000001"
            step="any"
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            required
          />
        </div>
        {/* Cost Per Share Input */}
        <div className="flex flex-col">
          <label htmlFor="costPerShare" className="block text-sm font-medium text-gray-300 mb-1">
            Cost Per Share
          </label>
          <input
            id="costPerShare"
            type="number"
            value={costPerShare}
            onChange={(e) => setCostPerShare(e.target.value)}
            placeholder="e.g., 150.50"
            min="0.01"
            step="any"
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            required
          />
        </div>
        {/* Purchase Date Input */}
        <div className="flex flex-col">
          <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-300 mb-1">
            Purchase Date
          </label>
          <input
            id="purchaseDate"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
            required
          />
        </div>
        {/* Currency Select */}
        <div className="flex flex-col">
          <label htmlFor="currency" className="block text-sm font-medium text-gray-300 mb-1">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow appearance-none"
            required
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="PLN">PLN</option>
            <option value="GBP">GBP</option>
            {/* Add other currencies as needed based on Portfolio model */}
          </select>
        </div>
        {/* Notes Textarea */}
        <div className="flex flex-col md:col-span-2 lg:col-span-1"> {/* Adjusted span for notes */}
          <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Initial investment"
            rows="3"
            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
          />
        </div>
        {/* Submit Button - Spans full width on small, adjusts on larger, centered content */}
        <div className="md:col-span-2 lg:col-span-3 flex justify-center items-end pt-4">
          <button
            type="submit"
            disabled={isAdding}
            className="w-full sm:w-auto flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <PlusCircleIcon className={`h-5 w-5 mr-2 ${isAdding ? 'animate-spin' : ''}`} />
            {isAdding ? 'Adding...' : 'Add Stock'}
          </button>
        </div>
      </div>
    </form>
  );
}
