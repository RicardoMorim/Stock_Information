"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image'; // Keep for SEC Filing modal if it uses <Image>

// Import new components
import StockDetailsSkeleton from '@/app/components/Stock/StockDetailsSkeleton';
import StockHeader from '@/app/components/Stock/StockHeader';
import PriceChart from '@/app/components/Stock/PriceChart';
import KeyMetrics from '@/app/components/Stock/KeyMetrics';
import NewsSection from '@/app/components/Stock/NewsSection';
import SECFilingsSection from '@/app/components/Stock/SECFilingsSection'; // Added import
import FilingViewModal from '@/app/components/Stock/FilingViewModal'; // Added import

// Caching functions (can be moved to a utils/cache.js if used elsewhere)
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
	const params = useParams();
	const symbol = params?.symbol; // Already decoded by Next.js router
	const router = useRouter();

	const [stockData, setStockData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	// const [selectedPeriod, setSelectedPeriod] = useState(0); // This state seems unused, consider removing if not needed
	const [showFiling, setShowFiling] = useState(false);
	const [filingDetails, setFilingDetails] = useState(null);
	const [filingIsLoading, setFilingIsLoading] = useState(false);


	useEffect(() => {
		if (!symbol) {
			// router.push("/stocks"); // Or handle as an error, as symbol should always be present
			setError("Symbol not provided.");
			setIsLoading(false);
			return;
		}

		const fetchStockDetails = async () => {
			setIsLoading(true);
			setError(null);
			try {
				// Check cache first - implement robust caching if needed
				// const cachedFinancials = getCachedData(symbol, 'financials');
				// if (cachedFinancials) {
				// setStockData(cachedFinancials);
				// setIsLoading(false);
				// return;
				// }

				const response = await fetch(`/api/stocks/stock/${encodeURIComponent(symbol)}`);
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || `Failed to fetch stock data for ${symbol}`);
				}
				const data = await response.json();
				if (data.success) {
					setStockData(data.data);
					// setCachedData(symbol, 'financials', data.data);
				} else {
					throw new Error(data.message || `Could not retrieve data for ${symbol}`);
				}
			} catch (err) {
				console.error("Error fetching stock details:", err);
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStockDetails();
	}, [symbol, router]);

	const fetchFilingDetails = async (url) => {
		if (!url) return;
		setFilingIsLoading(true);
		setShowFiling(true);
		setFilingDetails(null);
		try {
			const response = await fetch(`/api/stocks/filings/${encodeURIComponent(url)}`);
			if (!response.ok) {
				throw new Error('Failed to fetch filing details');
			}
			const data = await response.json();
			if (data.success) {
				setFilingDetails(data.data);
			} else {
				throw new Error(data.message || 'Could not retrieve filing details');
			}
		} catch (err) {
			console.error("Error fetching filing details:", err);
			// Optionally set an error state for the modal
		} finally {
			setFilingIsLoading(false);
		}
	};

	const handleCloseModal = () => {
		setShowFiling(false);
		setFilingDetails(null); // Clear details when closing
	};


	if (isLoading) {
		return <StockDetailsSkeleton />;
	}

	if (error) {
		return (
			<div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
				<p className="text-2xl text-red-500 mb-4">Error: {error}</p>
				<button
					onClick={() => router.push('/stocks')}
					className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
				>
					Back to Stocks
				</button>
			</div>
		);
	}

	if (!stockData) {
		return (
			<div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
				<p className="text-2xl text-gray-400 mb-4">Stock data not found for {symbol}.</p>
				<button
					onClick={() => router.push('/stocks')}
					className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
				>
					Back to Stocks
				</button>
			</div>
		);
	}

	const {
		name,
		exchangeShortName,
		type,
		price,
		changePercent,
		historicalData,
		news,
		high,
		low,
		volume,
		vwap,
		fundamentals,
		secFilings
	} = stockData;

	const keyMetricsData = { high, low, volume, vwap, fundamentals };

	return (
		<div className="container mx-auto p-4 md:p-6 bg-gray-900 text-white min-h-screen">
			<StockHeader
				symbol={symbol}
				name={name}
				exchange={exchangeShortName}
				price={price}
				changePercent={changePercent}
				type={type}
			/>

			<PriceChart historicalData={historicalData} symbol={symbol} />

			<KeyMetrics metrics={keyMetricsData} />
			
			{news && news.results && <NewsSection news={news.results} />}

			{secFilings && secFilings.length > 0 && (
				<SECFilingsSection
					secFilings={secFilings}
					onViewFiling={fetchFilingDetails}
				/>
			)}

			<FilingViewModal
				showFiling={showFiling}
				onClose={handleCloseModal}
				filingDetails={filingDetails}
				isLoading={filingIsLoading}
			/>
		</div>
	);
}
