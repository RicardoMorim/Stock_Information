"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Line } from "react-chartjs-2";
import Chart from "chart.js/auto";
import 'chartjs-adapter-date-fns';

export default function Stocks() {
	const router = useRouter();
	const [assets, setAssets] = useState([]);
	const [allAssets, setAllAssets] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) {
			router.push("/login");
			return;
		}

		// Fetch initial assets with all fields
		const fetchInitialAssets = async () => {
			try {
				const response = await fetch("/api/stocks");
				if (!response.ok) throw new Error("Failed to fetch assets");
				const data = await response.json();

				// Process stocks data with all fields (price, volume, vwap, etc.)
				const processedStocks = (data.data.stocks || []).map((stock) => ({
					symbol: stock.symbol,
					name: stock.name,
					type: stock.type,
					price: stock.price,
					change: stock.changePercent,
					high: stock.high,
					low: stock.low,
					volume: stock.volume,
					vwap: stock.vwap,
					timestamp: new Date(stock.timestamp),
					historicalData: stock.historicalData,
				}));

				// Process ETFs data
				const processedETFs = (data.data.etfs || []).map((etf) => ({
					symbol: etf.symbol,
					name: etf.name,
					type: etf.type,
					price: etf.price,
					change: etf.changePercent,
					high: etf.high,
					low: etf.low,
					volume: etf.volume,
					vwap: etf.vwap,
					timestamp: new Date(etf.timestamp),
					historicalData: etf.historicalData,
				}));

				// Process crypto data
				const processedCrypto = (data.data.cryptocurrencies || []).map((crypto) => ({
					symbol: crypto.symbol,
					name: crypto.name,
					type: crypto.type,
					price: crypto.price,
					change: crypto.changePercent,
					high: crypto.high,
					low: crypto.low,
					volume: crypto.volume,
					vwap: crypto.vwap,
					timestamp: new Date(crypto.timestamp),
					historicalData: crypto.historicalData,
				}));

				setAssets([...processedStocks, ...processedETFs, ...processedCrypto]);
				setIsLoading(false);
			} catch (error) {
				console.error("Error fetching assets:", error);
				setIsLoading(false);
			}
		};

		// Preload all assets for search
		const preloadAllAssets = async () => {
			try {
				const response = await fetch("/api/stocks/allStocks");
				if (!response.ok) throw new Error("Failed to fetch companies");
				const data = await response.json();

				// Process all assets with only the necessary fields for search
				const processedCompanies = (data.data || []).map((company) => ({
					symbol: company.symbol,
					name: company.name,
					type: company.type,
				}));

				setAllAssets(processedCompanies);
			} catch (error) {
				console.error("Error preloading companies:", error);
			}
		};

		fetchInitialAssets();
		preloadAllAssets();
	}, [router]);

	// Handle search filtering
	const handleSearch = (query) => {
		setSearchQuery(query);
		if (query === "") {
			setSearchResults([]);
		} else {
			const results = allAssets.filter((asset) =>
				asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
				asset.name.toLowerCase().includes(query.toLowerCase())
			);
			setSearchResults(results);
		}
	};

	// Determine which assets to display (search or initial assets)
	const displayedAssets = searchQuery ? searchResults : assets.slice(0, 20);

	// Asset Card component to display individual asset information
	const AssetCard = ({ asset }) => (
		<div className="bg-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-bold text-black">{asset.symbol}</h3>
					<p className="text-xs text-gray-500">
						{new Date(asset.timestamp).toLocaleString()}
					</p>
				</div>
				<span className="px-2 py-1 bg-navyBlue text-white rounded-full text-sm">
					{asset.type}
				</span>
			</div>

			<div className="mt-2 space-y-1">
				<p className="text-black text-lg font-semibold">
					${Number(asset.price).toFixed(2)}
				</p>
				<p className={`${asset.change >= 0 ? "text-green-600" : "text-red-600"}`}>
					{asset.change >= 0 ? "↑" : "↓"} {Math.abs(Number(asset.change)).toFixed(2)}%
				</p>
				<div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
					<p>H: ${Number(asset.high).toFixed(2)}</p>
					<p>L: ${Number(asset.low).toFixed(2)}</p>
					<p>Vol: {Number(asset.volume).toLocaleString()}</p>
					<p>VWAP: ${Number(asset.vwap).toFixed(2)}</p>
				</div>
			</div>

			<div className="mt-4">
				<Line
					data={{
						labels: asset.historicalData.map((data) => new Date(data.t)),
						datasets: [
							{
								label: `${asset.symbol} Price`,
								data: asset.historicalData.map((data) => data.c),
								borderColor: "rgba(75, 192, 192, 1)",
								backgroundColor: "rgba(75, 192, 192, 0.2)",
								fill: true,
							},
						],
					}}
					options={{
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
					}}
				/>
			</div>
		</div>
	);

	return (
		<>
			<Navbar />
			<div className="container mx-auto p-6">
				<div className="mb-8">
					<input
						type="text"
						placeholder="Search for any asset..."
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						className="w-full p-3 rounded-lg border border-navyBlue bg-white text-black"
					/>
				</div>

				{isLoading ? (
					<div className="text-center">Loading...</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{displayedAssets.map((asset, index) => (
							<AssetCard key={asset.symbol} asset={asset} />
						))}
					</div>
				)}
			</div>
			<Footer />
		</>
	);
}