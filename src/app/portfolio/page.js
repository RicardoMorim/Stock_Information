"use client";
import { useState, useEffect } from 'react';
import { FiPlusCircle, FiTrendingUp, FiTrendingDown, FiX } from 'react-icons/fi';

export default function PortfolioSummary() {
	const [portfolio, setPortfolio] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [formData, setFormData] = useState({
		symbol: '',
		shares: '',
		costPerShare: '',
		purchaseDate: new Date().toISOString().split('T')[0],
		notes: ''
	});
	const [formError, setFormError] = useState('');

	useEffect(() => {
		fetchPortfolio();
	}, []);

	const fetchPortfolio = async () => {
		try {
			const response = await fetch('/api/portfolio');
			const data = await response.json();
			if (data.success) {
				setPortfolio(data.data);
			}
			setIsLoading(false);
		} catch (error) {
			console.error('Error fetching portfolio:', error);
			setIsLoading(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setFormError('');

		try {
			const response = await fetch('/api/portfolio', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...formData,
					shares: Number(formData.shares),
					costPerShare: Number(formData.costPerShare)
				})
			});

			const data = await response.json();

			if (data.success) {
				setShowModal(false);
				setFormData({
					symbol: '',
					shares: '',
					costPerShare: '',
					purchaseDate: new Date().toISOString().split('T')[0],
					notes: ''
				});
				fetchPortfolio(); // Refresh portfolio data
			} else {
				setFormError(data.message || 'Failed to add position');
			}
		} catch (error) {
			setFormError('Failed to add position');
		}
	};

	// Calculate overall portfolio stats
	const totalInvestment = portfolio.reduce((sum, stock) =>
		sum + (stock.avgCostPerShare * stock.totalShares), 0);
	const currentValue = portfolio.reduce((sum, stock) =>
		sum + stock.totalValue, 0);
	const totalProfit = currentValue - totalInvestment;
	const percentageReturn = ((currentValue / totalInvestment - 1) * 100) || 0;

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-8">
			{/* Portfolio Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">My Portfolio</h1>
				<p className="text-gray-600">Track your investments and performance</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
					<div className="flex items-center justify-between">
						<p className="text-gray-500 text-sm font-medium">Total Investment</p>
					</div>
					<p className="text-2xl font-bold mt-2">${totalInvestment.toFixed(2)}</p>
				</div>

				<div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
					<div className="flex items-center justify-between">
						<p className="text-gray-500 text-sm font-medium">Current Value</p>
					</div>
					<p className="text-2xl font-bold mt-2">${currentValue.toFixed(2)}</p>
				</div>

				<div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
					<div className="flex items-center justify-between">
						<p className="text-gray-500 text-sm font-medium">Total Profit</p>
						{totalProfit >= 0 ? <FiTrendingUp className="text-green-500" /> : <FiTrendingDown className="text-red-500" />}
					</div>
					<p className={`text-2xl font-bold mt-2 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
						${totalProfit.toFixed(2)}
					</p>
				</div>

				<div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
					<div className="flex items-center justify-between">
						<p className="text-gray-500 text-sm font-medium">Return</p>
						{percentageReturn >= 0 ? <FiTrendingUp className="text-green-500" /> : <FiTrendingDown className="text-red-500" />}
					</div>
					<p className={`text-2xl font-bold mt-2 ${percentageReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
						{percentageReturn.toFixed(2)}%
					</p>
				</div>
			</div>

			{/* Holdings List */}
			<div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100">
					<h2 className="text-xl font-semibold text-black">Holdings</h2>
				</div>
				<div className="divide-y divide-gray-100">
					{portfolio.map((stock) => (
						<div
							key={stock.symbol}
							className="hover:bg-gray-50 transition-all duration-200 group"
						>
							<div className="px-6 py-6">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center space-x-4">
										<div>
											<h3 className="text-xl font-bold text-black mb-1">{stock.symbol}</h3>
											<p className="text-base text-black font-medium">
												{stock.totalShares.toLocaleString()} shares @ ${stock.avgCostPerShare.toFixed(2)}
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className={`text-lg font-bold ${stock.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											${stock.totalProfitLoss.toFixed(2)}
										</p>
										<p className={`text-base font-medium ${stock.percentageReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											{stock.percentageReturn >= 0 ? '+' : ''}{stock.percentageReturn.toFixed(2)}%
										</p>
									</div>
								</div>

								<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
									<div className="bg-gray-50 p-4 rounded-lg group-hover:bg-white transition-colors duration-200">
										<p className="text-sm font-medium text-gray-600 mb-1">Current Price</p>
										<p className="text-lg font-bold text-black">${stock.currentPrice.toFixed(2)}</p>
									</div>
									<div className="bg-gray-50 p-4 rounded-lg group-hover:bg-white transition-colors duration-200">
										<p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
										<p className="text-lg font-bold text-black">${stock.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
									</div>
									<div className="bg-gray-50 p-4 rounded-lg group-hover:bg-white transition-colors duration-200">
										<p className="text-sm font-medium text-gray-600 mb-1">Total Investment</p>
										<p className="text-lg font-bold text-black">
											${(stock.avgCostPerShare * stock.totalShares).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										</p>
									</div>
									<div className="bg-gray-50 p-4 rounded-lg group-hover:bg-white transition-colors duration-200">
										<p className="text-sm font-medium text-gray-600 mb-1">Return</p>
										<p className={`text-lg font-bold ${stock.percentageReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											{stock.percentageReturn >= 0 ? '+' : ''}{stock.percentageReturn.toFixed(2)}%
										</p>
									</div>
								</div>
							</div>
						</div>
					))}
					{portfolio.length === 0 && (
						<div className="px-6 py-8 text-center">
							<p className="text-black text-lg">No holdings found. Add a new position to get started.</p>
						</div>
					)}
				</div>
			</div>

			<button
				onClick={() => setShowModal(true)}
				className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors duration-150 flex items-center space-x-2"
			>
				<FiPlusCircle className="w-6 h-6" />
			</button>

			{showModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 transform transition-all duration-200 ease-out">
						<div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
							<h3 className="text-xl font-bold text-black">Add New Position</h3>
							<button
								onClick={() => setShowModal(false)}
								className="text-gray-600 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded-full"
							>
								<FiX className="w-6 h-6" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="p-6">
							<div className="space-y-6">
								{/* Form fields - update text colors */}
								<div>
									<label className="block text-base font-semibold text-black mb-2">
										Symbol
									</label>
									<input
										type="text"
										required
										className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										value={formData.symbol}
										onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
										placeholder="AAPL"
									/>
								</div>

								{/* Shares and Cost */}
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-900 mb-1">
											Shares
										</label>
										<input
											type="number"
											required
											min="0.0001"
											step="0.0001"
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
											value={formData.shares}
											onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
											placeholder="100"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-900 mb-1">
											Cost Per Share
										</label>
										<input
											type="number"
											required
											min="0.01"
											step="0.001"
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
											value={formData.costPerShare}
											onChange={(e) => setFormData({ ...formData, costPerShare: e.target.value })}
											placeholder="150.00"
										/>
									</div>
								</div>

								{/* Date */}
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-1">
										Purchase Date
									</label>
									<input
										type="date"
										required
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
										value={formData.purchaseDate}
										onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
									/>
								</div>

								{/* Notes */}
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-1">
										Notes (Optional)
									</label>
									<textarea
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-gray-900"
										value={formData.notes}
										onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
										placeholder="Add any notes about this position..."
									/>
								</div>

								{formError && (
									<div className="text-red-600 text-sm mt-2 font-medium">
										{formError}
									</div>
								)}
							</div>

							<div className="mt-6 flex justify-end space-x-3">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="px-4 py-2 text-sm font-medium text-gray-900 hover:text-gray-900 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
								>
									Add Position
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

		</div>
	);
}