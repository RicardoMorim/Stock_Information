"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	TimeScale,
} from 'chart.js';
import Image from "next/image";

// Register Chart.js components
ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	TimeScale
);

const getCachedData = (symbol, type) => {
	try {
		const data = localStorage.getItem(`stock_${symbol}_${type}`);
		if (!data) return null;
		const { value, timestamp } = JSON.parse(data);
		if (Date.now() - timestamp > 24 * 60 * 60 * 1000 * 2) {
			localStorage.removeItem(`stock_${symbol}_${type}`);
			return null;
		}
		return value;
	} catch (error) {
		console.error('Cache read error:', error);
		return null;
	}
};

const setCachedData = (symbol, type, data) => {
	try {
		localStorage.setItem(`stock_${symbol}_${type}`, JSON.stringify({
			value: data,
			timestamp: Date.now()
		}));
	} catch (error) {
		console.error('Cache write error:', error);
	}
};

export default function StockDetails() {
	// Use useParams to get the dynamic route parameter
	const params = useParams();
	const symbol = params?.symbol;

	const [stockData, setStockData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedPeriod, setSelectedPeriod] = useState(0);
	const [showFiling, setShowFiling] = useState(false);
	const [filingDetails, setFilingDetails] = useState(null);

	const router = useRouter();


	useEffect(() => {
		if (!symbol) {
			router.push("/stocks");
			return;
		}

		const fetchStockDetails = async () => {
			try {
				// Check cache first
				const cachedFinancials = getCachedData(symbol, 'financials');
				const cachedFilings = getCachedData(symbol, 'filings');

				// If we have cached data and it's still within same quarter, use it
				if (cachedFinancials && cachedFilings) {
					const lastUpdate = new Date(cachedFinancials.timestamp);
					const currentQuarter = Math.floor(new Date().getMonth() / 3);
					const cachedQuarter = Math.floor(lastUpdate.getMonth() / 3);

					if (
						lastUpdate.getFullYear() === new Date().getFullYear() &&
						currentQuarter === cachedQuarter
					) {
						setStockData({
							...cachedFinancials.data,
							fundamentals: cachedFinancials.fundamentals,
							filings: cachedFilings
						});
						setIsLoading(false);
						return;
					}
				}

				// Fetch fresh data if no cache or cache expired
				const encodedSymbol = encodeURIComponent(symbol);
				const response = await fetch(`/api/stocks/stock/${encodedSymbol}`);
				if (!response.ok) throw new Error("Failed to fetch stock data");

				const data = await response.json();

				// Cache the new data
				setCachedData(symbol, 'financials', {
					data: data.data,
					fundamentals: data.data.fundamentals
				});
				setCachedData(symbol, 'filings', data.data.filings);

				setStockData(data.data);
				setIsLoading(false);
			} catch (error) {
				console.error("Error fetching stock details:", error);
				setError(error.message);
				setIsLoading(false);
			}
		};

		fetchStockDetails();
	}, [symbol, router]);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error}</div>;
	}

	if (!stockData) {
		return <div>Stock not found.</div>;
	}

	const {
		historicalData,
		dividends,
		news,
		price,
		changePercent,
		high,
		low,
		volume,
		vwap,
		fundamentals
	} = stockData;

	const calculateFinancialRatios = (income, balance) => {
		const netIncome = income.net_income_loss?.value || 0;
		const totalAssets = balance.assets?.value || 0;
		const equity = balance.equity?.value || 0;
		const totalDebt = balance.liabilities?.value || 0;
		const revenue = income.revenues?.value || 0;
		const ebit = income.operating_income_loss?.value || 0;
		const shares = income.diluted_average_shares?.value || 0;

		return {
			ROA: (netIncome / totalAssets) * 100,
			ROE: (netIncome / equity) * 100,
			EPS: income.diluted_earnings_per_share?.value || 0,
			debtToEquity: (totalDebt / equity) * 100,
			profitMargin: (netIncome / revenue) * 100,
			operatingMargin: (ebit / revenue) * 100,
			revenuePerShare: revenue / shares,
			bookValuePerShare: equity / shares,
		};
	};


	// Chart data
	const chartData = {
		labels: historicalData?.data?.map((data) => new Date(data.t)) || [],
		datasets: [
			{
				label: `${symbol} Price`,
				data: historicalData?.data?.map((data) => data.c) || [],
				borderColor: "rgba(75, 192, 192, 1)",
				backgroundColor: "rgba(75, 192, 192, 0.2)",
				fill: true,
			},
		],
	};

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		scales: {
			x: {
				type: "time",
				time: {
					unit: "month",
					tooltipFormat: "MMM yyyy",
					displayFormats: {
						month: "MMM yyyy",
					},
				},
				title: {
					display: true,
					text: "Date",
				},
			},
			y: {
				beginAtZero: false,
				title: {
					display: true,
					text: "Price",
				},
			},
		},
	};

	return (
		<div className="container mx-auto p-6">
			{/* Basic Info Card - Always show if we have price */}
			<div className="bg-white rounded-lg p-6 shadow-lg mb-6">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold">{symbol}</h1>
					<div className="flex gap-2">
						{Object.entries(stockData.dataAvailability || {}).map(([key, available]) => (
							<span
								key={key}
								className={`px-2 py-1 text-xs rounded-full ${
									available
										? 'bg-green-100 text-green-800'
										: 'bg-gray-100 text-gray-600'
								}`}
							>
								{key}
							</span>
						))}
					</div>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
					<div>
						<p className="text-gray-600">Price</p>
						<p className="text-2xl font-bold">${stockData.price?.toFixed(2)}</p>
					</div>
					<div>
						<p className="text-gray-600">Change</p>
						<p
							className={`text-xl font-bold ${
								stockData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
							}`}
						>
							{stockData.changePercent >= 0 ? '+' : ''}
							{stockData.changePercent?.toFixed(2)}%
						</p>
					</div>
					<div>
						<p className="text-gray-600">Volume</p>
						<p className="text-xl font-bold">{stockData.volume?.toLocaleString()}</p>
					</div>
					<div>
						<p className="text-gray-600">VWAP</p>
						<p className="text-xl font-bold">${stockData.vwap?.toFixed(2)}</p>
					</div>
				</div>
			</div>

			{/* Historical Data Chart - Only show if data available */}
			{stockData.dataAvailability?.historical ? (
				<div className="bg-white rounded-lg p-6 shadow-lg mb-6">
					<h2 className="text-xl font-semibold mb-4">Price History</h2>
					<div style={{ height: '400px' }}>
						<Line data={chartData} options={chartOptions} />
					</div>
				</div>
			) : (
				<div className="bg-white rounded-lg p-6 shadow-lg mb-6">
					<h2 className="text-xl font-semibold mb-4">Price History</h2>
					<p className="text-gray-600">Historical data not available for this asset</p>
				</div>
			)}

			{/* News Section - Only show if data available */}
			{stockData.dataAvailability?.news ? (
				// ...existing code...
				<div className="mt-6 bg-white rounded-lg p-4 shadow-lg">
					<h3 className="text-lg font-semibold mb-4">Latest News</h3>
					<div className="grid grid-cols-1 gap-6">
						{news.map((article, index) => (
							<div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-300 bg-white">
								<div className="flex gap-4">
									{/* Image Section */}
									{article.images?.length > 0 && (
										<div className="hidden sm:block flex-shrink-0">
											<Image src={article.images.find(img => img.size === "thumb")?.url || article.images[0].url}
												alt=""
												width={128}
												height={96}
												className="w-32 h-24 object-cover rounded-lg" onError={(e) => e.target.style.display = 'none'}
											/>
										</div>
									)}

									{/* Content Section */}
									<div className="flex-1">
										{/* Header */}
										<div className="flex justify-between items-start gap-4 mb-2">
											<a
												href={article.url}
												target="_blank"
												rel="noopener noreferrer"
												className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline line-clamp-2"
											>
												{article.headline || article.title}
											</a>
											<time className="text-xs text-gray-500 whitespace-nowrap">
												{new Date(article.created_at).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</time>
										</div>

										{/* Summary */}
										{article.summary && article.summary.trim() !== " " && (
											<p className="text-sm text-gray-600 mb-3 line-clamp-2">
												{article.summary}
											</p>
										)}

										{/* Footer */}
										<div className="flex flex-wrap items-center gap-2 text-xs">
											<div className="flex items-center text-gray-500">
												<span className="mr-2">Source:</span>
												<a
													href={`https://${article.source}.com`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-500 hover:text-blue-700 hover:underline capitalize"
												>
													{article.source}
												</a>
												{article.author && (
													<>
														<span className="mx-2">•</span>
														<span>By {article.author}</span>
													</>
												)}
											</div>

											{/* Related Symbols */}
											{article.symbols && article.symbols.length > 0 && (
												<div className="flex flex-wrap gap-1 ml-auto">
													{article.symbols.map(symbol => (
														<a
															key={symbol}
															href={`/stocks/${symbol}`}
															className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
														>
															${symbol}
														</a>
													))}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="bg-white rounded-lg p-6 shadow-lg mb-6">
					<h2 className="text-xl font-semibold mb-4">Latest News</h2>
					<p className="text-gray-600">No news available for this asset</p>
				</div>
			)}

			{/* Fundamentals Section - Only show if data available */}
			{stockData.dataAvailability?.fundamentals && (
				// ...existing code...
				<div className="mt-6 bg-white rounded-lg p-4 shadow-lg text-black">
					<h3 className="text-lg font-semibold mb-4">Financial Ratios</h3>
					{fundamentals?.[selectedPeriod] && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
							{/* Profitability Ratios */}
							<div>
								<h4 className="text-sm font-medium text-gray-500 mb-2">Profitability</h4>
								<div className="space-y-2">
									<div>
										<p className="text-sm text-gray-600">ROA</p>
										<p className="font-semibold">
											{calculateFinancialRatios(
												fundamentals[selectedPeriod].income,
												fundamentals[selectedPeriod].balance
											).ROA.toFixed(2)}%
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-600">ROE</p>
										<p className="font-semibold">
											{calculateFinancialRatios(
												fundamentals[selectedPeriod].income,
												fundamentals[selectedPeriod].balance
											).ROE.toFixed(2)}%
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-600">Operating Margin</p>
										<p className="font-semibold">
											{calculateFinancialRatios(
												fundamentals[selectedPeriod].income,
												fundamentals[selectedPeriod].balance
											).operatingMargin.toFixed(2)}%
										</p>
									</div>
								</div>
							</div>

							{/* Per Share Metrics */}
							<div>
								<h4 className="text-sm font-medium text-gray-500 mb-2">Per Share</h4>
								<div className="space-y-2">
									<div>
										<p className="text-sm text-gray-600">EPS</p>
										<p className="font-semibold">
											${calculateFinancialRatios(
												fundamentals[selectedPeriod].income,
												fundamentals[selectedPeriod].balance
											).EPS.toFixed(2)}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-600">Revenue/Share</p>
										<p className="font-semibold">
											${calculateFinancialRatios(
												fundamentals[selectedPeriod].income,
												fundamentals[selectedPeriod].balance
											).revenuePerShare.toFixed(2)}
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-600">Book Value/Share</p>
										<p className="font-semibold">
											${calculateFinancialRatios(
												fundamentals[selectedPeriod].income,
												fundamentals[selectedPeriod].balance
											).bookValuePerShare.toFixed(2)}
										</p>
									</div>
								</div>
							</div>

							{/* Leverage Metrics */}
							<div>
								<h4 className="text-sm font-medium text-gray-500 mb-2">Leverage</h4>
								<div className="space-y-2">
									<div>
										<p className="text-sm text-gray-600">Debt/Equity</p>
										<p className="font-semibold">
											{calculateFinancialRatios(
												fundamentals[selectedPeriod].income,
												fundamentals[selectedPeriod].balance
											).debtToEquity.toFixed(2)}%
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Financial Details Section */}
			<div className="mt-6 bg-white rounded-lg p-4 shadow-lg text-black">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold">Detailed Financials</h3>
					<div className="flex flex-col items-end">
						<select
							value={selectedPeriod}
							onChange={(e) => setSelectedPeriod(Number(e.target.value))}
							className="p-2 border rounded-lg mb-1"
						>
							{fundamentals?.map((f, i) => (
								<option key={i} value={i}>
									{f.period.fiscalYear} {f.period.fiscalPeriod} ({new Date(f.period.endDate).toLocaleDateString()})
								</option>
							))}
						</select>

						{/* Cache info display */}
						<div className="text-xs text-gray-500">
							{(() => {
								const cachedData = getCachedData(symbol, 'financials');
								const timestamp = cachedData?.timestamp;
								const lastUpdated = timestamp ? new Date(timestamp) : null;

								return (
									<>
										Last updated: {
											lastUpdated && !isNaN(lastUpdated)
												? lastUpdated.toLocaleString()
												: 'Not cached yet'
										}
										{fundamentals?.[0]?.period?.fiscalPeriod && (
											<span className="ml-2">
												Latest Period: {fundamentals[0].period.fiscalYear} {' '}
												{fundamentals[0].period.fiscalPeriod === 'TTM'
													? 'Trailing 12 Months'
													: fundamentals[0].period.fiscalPeriod}
											</span>
										)}
									</>
								);
							})()}
						</div>
					</div>
				</div>
				{fundamentals?.[selectedPeriod] && (
					<div className="space-y-6">
						{/* Meta Information */}
						<div>
							<h4 className="font-semibold mb-2">Filing Information</h4>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								<div>
									<p className="text-gray-500">Company</p>
									<p>{fundamentals[selectedPeriod].companyInfo.name}</p>
								</div>
								<div>
									<p className="text-gray-500">Period</p>
									<p>{fundamentals[selectedPeriod].period.fiscalYear} {fundamentals[selectedPeriod].period.fiscalPeriod}</p>
								</div>
								<div>
									<p className="text-gray-500">Date Range</p>
									<p>{new Date(fundamentals[selectedPeriod].period.startDate).toLocaleDateString()} - {new Date(fundamentals[selectedPeriod].period.endDate).toLocaleDateString()}</p>
								</div>
								<div>
									<p className="text-gray-500">Filing Date</p>
									<p>{new Date(fundamentals[selectedPeriod].period.filingDate).toLocaleDateString()}</p>
								</div>
							</div>
						</div>

						{/* Income Statement */}
						<div>
							<h4 className="font-semibold mb-2">Income Statement</h4>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								{Object.entries(fundamentals[selectedPeriod].income).map(([key, value]) => (
									<div key={key}>
										<p className="text-gray-500">{value.label}</p>
										<p>{value.unit === 'USD'
											? `$${(value.value / 1e9).toFixed(2)}B`
											: value.value?.toFixed(2)}</p>
									</div>
								))}
							</div>
						</div>

						{/* Balance Sheet */}
						<div>
							<h4 className="font-semibold mb-2">Balance Sheet</h4>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								{Object.entries(fundamentals[selectedPeriod].balance).map(([key, value]) => (
									<div key={key}>
										<p className="text-gray-500">{value.label}</p>
										<p>{value.unit === 'USD'
											? `$${(value.value / 1e9).toFixed(2)}B`
											: value.value?.toFixed(2)}</p>
									</div>
								))}
							</div>
						</div>

						{/* Cash Flow */}
						<div>
							<h4 className="font-semibold mb-2">Cash Flow</h4>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								{Object.entries(fundamentals[selectedPeriod].cashFlow).map(([key, value]) => (
									<div key={key}>
										<p className="text-gray-500">{value.label}</p>
										<p>{value.unit === 'USD'
											? `$${(value.value / 1e9).toFixed(2)}B`
											: value.value?.toFixed(2)}</p>
									</div>
								))}
							</div>
						</div>

						{/* Comprehensive Income */}
						<div>
							<h4 className="font-semibold mb-2">Comprehensive Income</h4>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								{Object.entries(fundamentals[selectedPeriod].comprehensive).map(([key, value]) => (
									<div key={key}>
										<p className="text-gray-500">{value.label}</p>
										<p>{value.unit === 'USD'
											? `$${(value.value / 1e9).toFixed(2)}B`
											: value.value?.toFixed(2)}</p>
									</div>
								))}
							</div>
						</div>

						{/* Filing Link */}
						<div>
							<button
								onClick={async () => {
									try {
										const response = await fetch(`/api/stocks/filings/${encodeURIComponent(fundamentals[selectedPeriod].period.sourceUrl)}`);
										const data = await response.json();
										setFilingDetails(JSON.parse(data.data).results);
										setShowFiling(true);
									} catch (error) {
										console.error('Failed to fetch filing:', error);
									}
								}}
								className="text-blue-600 hover:underline text-sm flex items-center gap-1"
							>
								View SEC Filing Details
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
								</svg>
							</button>

							{/* Filing Modal */}
							{showFiling && filingDetails && (
								<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
									<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6">
										<div className="flex justify-between items-center mb-6">
											<h3 className="text-xl font-semibold">SEC Filing Details</h3>
											<button
												onClick={() => setShowFiling(false)}
												className="text-gray-500 hover:text-gray-700"
											>
												<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</div>

										<div className="space-y-6">
											{/* Basic Info */}
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<p className="text-gray-500">Filing Type</p>
													<p className="font-medium">{filingDetails.type}</p>
												</div>
												<div>
													<p className="text-gray-500">Filing Date</p>
													<p className="font-medium">{new Date(filingDetails.filing_date).toLocaleDateString()}</p>
												</div>
												<div>
													<p className="text-gray-500">Period of Report</p>
													<p className="font-medium">{new Date(filingDetails.period_of_report_date).toLocaleDateString()}</p>
												</div>
												<div>
													<p className="text-gray-500">Accession Number</p>
													<p className="font-medium">{filingDetails.accession_number}</p>
												</div>
											</div>

											{/* Company Info */}
											<div>
												<h4 className="font-semibold mb-2">Company Information</h4>
												<div className="grid grid-cols-2 gap-4 text-sm">
													<div>
														<p className="text-gray-500">Name</p>
														<p className="font-medium">{filingDetails.entities[0].company_data.name}</p>
													</div>
													<div>
														<p className="text-gray-500">CIK</p>
														<p className="font-medium">{filingDetails.entities[0].company_data.cik}</p>
													</div>
													<div>
														<p className="text-gray-500">Tickers</p>
														<p className="font-medium">{filingDetails.entities[0].company_data.tickers.join(", ")}</p>
													</div>
												</div>
											</div>

											{/* Public SEC Link */}
											<div>
												<h4 className="font-semibold mb-2">View Filing</h4>
												<a
													href={`https://www.sec.gov/Archives/edgar/data/${filingDetails.entities[0].company_data.cik}/${filingDetails.accession_number.replace(/-/g, '')}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:underline flex items-center gap-1"
												>
													View on SEC EDGAR Website
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
													</svg>
												</a>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Historical Metrics Chart */}
			<div className="mt-6 bg-white rounded-lg p-4 shadow-lg text-black">
				<h3 className="text-lg font-semibold mb-4">Metrics Over Time</h3>


				{/* Chart */}
				<div style={{ height: "400px" }}>
					<Line
						data={{
							labels: historicalData?.data?.map(data => new Date(data.t)),
							datasets: [
								{
									label: 'Open',
									data: historicalData?.data?.map(data => data.o),
									borderColor: 'rgb(75, 192, 192)',
									tension: 0.1
								},
								{
									label: 'High',
									data: historicalData?.data?.map(data => data.h),
									borderColor: 'rgb(54, 162, 235)',
									tension: 0.1
								},
								{
									label: 'Low',
									data: historicalData?.data?.map(data => data.l),
									borderColor: 'rgb(255, 99, 132)',
									tension: 0.1
								},
								{
									label: 'Close',
									data: historicalData?.data?.map(data => data.c),
									borderColor: 'rgb(153, 102, 255)',
									tension: 0.1
								},
								{
									label: 'Volume',
									data: historicalData?.data?.map(data => data.v),
									borderColor: 'rgb(255, 159, 64)',
									tension: 0.1,
									yAxisID: 'volume'
								}
							]
						}}
						options={{
							responsive: true,
							maintainAspectRatio: false,
							interaction: {
								mode: 'index',
								intersect: false,
							},
							scales: {
								x: {
									type: 'time',
									time: {
										unit: 'month',
										tooltipFormat: 'MMM yyyy'
									},
									title: {
										display: true,
										text: 'Date'
									}
								},
								y: {
									type: 'linear',
									display: true,
									position: 'left',
									title: {
										display: true,
										text: 'Price ($)'
									}
								},
								volume: {
									type: 'linear',
									display: true,
									position: 'right',
									title: {
										display: true,
										text: 'Volume'
									},
									grid: {
										drawOnChartArea: false
									}
								}
							}
						}}
					/>
				</div>
			</div>
		</div >
	);
}
