
export default function PortfolioHeader({ totalValue }) {
  // Helper to format currency, assuming you might have one (e.g., in utils/currency.js)
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="mb-8 text-center md:text-left">
      <h1 className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">My Portfolio</h1>
      {typeof totalValue === 'number' && (
        <p className="text-xl md:text-2xl text-gray-300">
          Total Value: <span className="font-semibold text-green-400">{formatCurrency(totalValue)}</span>
        </p>
      )}
    </div>
  );
}
