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

export default function StockDetails() {
	// Use useParams to get the dynamic route parameter
	const params = useParams();
	const symbol = params?.symbol;

	const [stockData, setStockData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	const router = useRouter();

	useEffect(() => {
		if (!symbol) {
			// Redirect to stocks page if no symbol
			router.push("/stocks");
			return;
		}

		const fetchStockDetails = async () => {
			try {
				const response = await fetch(`/api/stocks/stock/${symbol}`);
				if (!response.ok) throw new Error("Failed to fetch stock data");

				const data = await response.json();
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
	} = stockData;



	// Chart data
	const chartData = {
		labels: historicalData.map((data) => new Date(data.t)), // Change from data.date to data.t
		datasets: [
			{
				label: `${symbol} Price`,
				data: historicalData.map((data) => data.c), // Change from data.close to data.c
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
			<h1 className="text-3xl font-bold">{symbol} Stock Details</h1>

			<div className="mt-6">
				{/* Stock Price Chart */}
				<div className="bg-white rounded-lg p-4 shadow-lg">
					<h2 className="text-xl font-semibold">Stock Price Chart</h2>
					<div style={{ height: "400px" }}>
						<Line data={chartData} options={chartOptions} />
					</div>
				</div>

				{/* Stock Metrics */}
				<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
					<div className="bg-white rounded-lg p-4 shadow-lg">
						<h3 className="text-lg font-semibold">Stock Metrics</h3>
						<ul>
							<li><strong>Current Price:</strong> ${price}</li>
							<li><strong>Change Percent:</strong> {changePercent.toFixed(2)}%</li>
							<li><strong>High:</strong> ${high}</li>
							<li><strong>Low:</strong> ${low}</li>
							<li><strong>Volume:</strong> {volume}</li>
							<li><strong>VWAP:</strong> ${vwap}</li>
						</ul>
					</div>

					{/* Dividends */}
					<div className="bg-white rounded-lg p-4 shadow-lg text-black">
						<h3 className="text-lg font-semibold">Dividends</h3>
						{dividends ? (
							<ul>
								<li>
									<strong>Last Year's Dividend Amount:</strong> ${dividends.annualDividendAmount?.toFixed(2) || '0.00'}
								</li>
								<li>
									<strong>Dividend Yield:</strong> {dividends.dividendYield?.toFixed(2) || '0.00'}%
								</li>
							</ul>
						) : (
							<p>No dividend data available.</p>
						)}
					</div>
				</div>

				{/* News */}
				<div className="mt-6 bg-white rounded-lg p-4 shadow-lg">
					<h3 className="text-lg font-semibold">News</h3>
					<ul>
						{news.map((article, index) => (
							<li key={index} className="mb-4">
								<a href={article.url} target="_blank" className="text-blue-600">
									{article.title}
								</a>
								<p className="text-sm text-gray-600">{article.summary}</p>
							</li>
						))}
					</ul>
				</div>

				{/* Historical Data Table */}
				<div className="mt-6 bg-white rounded-lg p-4 shadow-lg text-black">
					<h3 className="text-lg font-semibold">Metrics Over Time</h3>
					<table className="table-auto w-full">
						<thead>
							<tr>
								<th>Date</th>
								<th>Open</th>
								<th>High</th>
								<th>Low</th>
								<th>Close</th>
								<th>Volume</th>
							</tr>
						</thead>
						<tbody>
							{historicalData.map((data, index) => (
								<tr key={index}>
									<td>{new Date(data.t).toLocaleDateString()}</td>
									<td>${data.o.toFixed(2)}</td>
									<td>${data.h.toFixed(2)}</td>
									<td>${data.l.toFixed(2)}</td>
									<td>${data.c.toFixed(2)}</td>
									<td>{data.v.toLocaleString()}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
