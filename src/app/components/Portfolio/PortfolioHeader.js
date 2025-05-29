import { formatCurrency } from '@/app/utils/currency';

export default function PortfolioHeader({
  totalValue = 0,
  totalInvestment = 0,
  totalProfitLoss = 0,
  overallPercentageReturn = 0 // Defaulting here and for other numeric props
}) {
  const isGain = totalProfitLoss >= 0;

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8 md:mb-10">
      <h1 className="text-3xl font-bold text-white mb-6 text-center md:text-left">My Portfolio</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center md:text-left">
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider">Total Value</p>
          <p className="text-2xl font-semibold text-white">{formatCurrency(totalValue, 'EUR')}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider">Total Investment</p>
          <p className="text-2xl font-semibold text-white">{formatCurrency(totalInvestment, 'EUR')}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider">Overall Gain/Loss</p>
          <p className={`text-2xl font-semibold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(totalProfitLoss, 'EUR')}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wider">Overall Return</p>
          <p className={`text-2xl font-semibold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
            {isGain ? '+' : ''}{overallPercentageReturn.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
