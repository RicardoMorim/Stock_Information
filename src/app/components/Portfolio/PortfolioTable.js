import PortfolioTableRow from './PortfolioTableRow';

export default function PortfolioTable({ portfolio, onSell, isSelling }) {
  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-gray-500">Your portfolio is empty.</p>
        <p className="text-gray-400 mt-2">Add stocks using the form above to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-gray-800 shadow-lg rounded-lg">
      <table className="min-w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-gray-750">
          <tr>
            <th scope="col" className="px-3 py-3 md:px-5 md:py-4 whitespace-nowrap">Name (Symbol)</th>
            <th scope="col" className="px-3 py-3 md:px-5 md:py-4 text-right whitespace-nowrap">Quantity</th>
            <th scope="col" className="px-3 py-3 md:px-5 md:py-4 text-right whitespace-nowrap">Avg. Cost/Share</th>
            <th scope="col" className="px-3 py-3 md:px-5 md:py-4 text-right whitespace-nowrap">Current Price</th>
            <th scope="col" className="px-3 py-3 md:px-5 md:py-4 text-right whitespace-nowrap">Total Value</th>
            <th scope="col" className="px-3 py-3 md:px-5 md:py-4 text-right whitespace-nowrap">Gain/Loss (%)</th>
            <th scope="col" className="px-3 py-3 md:px-5 md:py-4 text-center whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((stock) => (
            <PortfolioTableRow 
              key={stock.symbol} 
              stock={stock} 
              onSell={onSell} 
              isSelling={isSelling} 
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
