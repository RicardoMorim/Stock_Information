"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import PortfolioSkeleton from '@/app/components/Portfolio/PortfolioSkeleton'; 
import PortfolioHeader from '@/app/components/Portfolio/PortfolioHeader';
import AddStockForm from '@/app/components/Portfolio/AddStockForm';
import PortfolioTable from '@/app/components/Portfolio/PortfolioTable';

export default function PortfolioPage() {
	const [portfolio, setPortfolio] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isAdding, setIsAdding] = useState(false);
	const [isSelling, setIsSelling] = useState(null); // Stores symbol of stock being sold
	const router = useRouter();

	const fetchPortfolio = useCallback(async () => {
		// setIsLoading(true); // Only set true on initial load or full refresh
		setError(null);
		try {
			const token = localStorage.getItem("token"); // Get token

			const headers = {
				'Content-Type': 'application/json',
			};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch('/api/portfolio', { headers }); // Pass headers
			if (!response.ok) {
				if (response.status === 401) {
					router.push('/login'); // Redirect to login if not authenticated
					return;
				}
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to fetch portfolio');
			}
			const data = await response.json();
			if (data.success) {
				setPortfolio(data.data);
			} else {
				throw new Error(data.message || 'Could not retrieve portfolio');
			}
		} catch (err) {
			console.error("Error fetching portfolio:", err);
			setError(err.message);
			// setPortfolio(null); // Keep existing portfolio data on refresh error if desired
		} finally {
			setIsLoading(false); // Ensure this is set correctly after initial load
		}
	}, [router]);

	useEffect(() => {
		setIsLoading(true); // Set loading true for the initial fetch
		fetchPortfolio();
	}, [fetchPortfolio]);

	const handleAddStock = async ({ symbol, quantity }) => {
		setIsAdding(true);
		setError(null);
		try {
			const token = localStorage.getItem("token"); // Get token

			const headers = {
				'Content-Type': 'application/json',
			};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch('/api/portfolio', {
				method: 'POST',
				headers: headers, // Pass headers
				body: JSON.stringify({ symbol, quantity }),
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to add stock');
			}
			if (data.success) {
				// Instead of setting portfolio directly from response (which is just a success message),
				// re-fetch the entire portfolio to get updated prices and all holdings.
				await fetchPortfolio();
			} else {
				throw new Error(data.message || 'Could not add stock to portfolio');
			}
		} catch (err) {
			console.error("Error adding stock:", err);
			setError(err.message); // Display error to user
		} finally {
			setIsAdding(false);
		}
	};

	const handleSellStock = async (symbol, quantity) => {
		setIsSelling(symbol); // Set symbol of stock being sold to manage loading state
		setError(null);
		try {
			const token = localStorage.getItem("token"); // Get token

			const headers = {
				'Content-Type': 'application/json',
			};
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			const response = await fetch(`/api/portfolio/${encodeURIComponent(symbol)}`, {
				method: 'DELETE',
				headers: headers, // Pass headers
				body: JSON.stringify({ quantity }),
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to sell stock');
			}
			if (data.success) {
				// Re-fetch portfolio to reflect changes
				await fetchPortfolio();
			} else {
				throw new Error(data.message || 'Could not sell stock');
			}
		} catch (err) {
			console.error("Error selling stock:", err);
			setError(err.message); // Display error to user
		} finally {
			setIsSelling(null); // Reset selling state
		}
	};

	const totalPortfolioValue = useMemo(() => {
		if (!portfolio || portfolio.length === 0) return 0;
		return portfolio.reduce((acc, stock) => acc + (stock.total_value || 0), 0);
	}, [portfolio]);


	if (isLoading && !portfolio) { // Show skeleton only on initial load when portfolio is null
		return <PortfolioSkeleton />;
	}

	// Show error page if initial load fails critically
	if (error && !portfolio) {
		return (
			<div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
				<p className="text-2xl text-red-500 mb-4">Error: {error}</p>
				<button
					onClick={() => fetchPortfolio()} // Allow retry
					className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors mb-4"
				>
					Retry
				</button>
				<button
					onClick={() => router.push('/')}
					className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
				>
					Go to Homepage
				</button>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 md:p-6 bg-gray-900 text-white min-h-screen">
			<PortfolioHeader totalValue={totalPortfolioValue} />

			{/* Display general errors (e.g., from add/sell) above the form */}
			{error && portfolio && (
				<div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md relative mb-6" role="alert">
					<strong className="font-bold">Error: </strong>
					<span className="block sm:inline">{error}</span>
				</div>
			)}

			<AddStockForm onAddStock={handleAddStock} isAdding={isAdding} />

			{isLoading && portfolio && (
				<div className="text-center py-4">
					<p className="text-lg text-blue-400">Refreshing portfolio data...</p>
					{/* You could add a small spinner here too */}
				</div>
			)}

			<PortfolioTable
				portfolio={portfolio || []}
				onSell={handleSellStock}
				isSelling={isSelling}
			/>
		</div>
	);
}