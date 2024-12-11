import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Stock from '@/app/models/Stock';

const POLYGON_API_KEY = process.env.POLYGON_KEY;
const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;

export async function GET(req, { params }) {
	try {
		await connectToDatabase();

		// Extract the symbol from the request parameters
		const { symbol } = await params;

		if (!symbol) {
			return NextResponse.json(
				{ success: false, message: 'Symbol is required.' },
				{ status: 400 }
			);
		}

		// Fetch data from Alpaca API
		const fetchSnapshot = async (symbol, isCrypto = false) => {
			let baseUrl;
			if (isCrypto) {
				baseUrl = 'https://data.alpaca.markets/v1beta3/crypto/us/snapshots';
				symbol = symbol.replace('/', '%2F');
			} else {
				baseUrl = 'https://data.alpaca.markets/v2/stocks/snapshots';
			}

			const url = `${baseUrl}?symbols=${symbol}`;

			const response = await fetch(url, {
				headers: {
					'APCA-API-KEY-ID': ALPACA_API_KEY,
					'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
				},
			});

			if (!response.ok) {
				throw new Error(`API Error: ${response.status} ${response.statusText}`);
			}

			return response.json();
		};

		const fetchHistoricalData = async (symbol, isCrypto = false) => {
			let baseUrl;
			if (isCrypto) {
				baseUrl = 'https://data.alpaca.markets/v1beta3/crypto/us/bars';
			} else {
				baseUrl = 'https://data.alpaca.markets/v2/stocks/bars';
			}

			const url = `${baseUrl}?symbols=${symbol}&timeframe=1Day&start=${new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()}`;

			const response = await fetch(url, {
				headers: {
					'APCA-API-KEY-ID': ALPACA_API_KEY,
					'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
				},
			});

			if (!response.ok) {
				throw new Error(`API Error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			console.log("Details: " + data)

			return data.bars[symbol] || [];
		};

		const fetchAssetDetails = async (symbol) => {
			let dbAsset = await Stock.findOne({ symbol }).exec();

			if (dbAsset) {
				return {
					name: dbAsset.name,
					type: dbAsset.type || null,
				};
			}

			if (!dbAsset && symbol.includes('.')) {
				const hyphenSymbol = symbol.replace('.', '-');
				dbAsset = await Stock.findOne({ symbol: hyphenSymbol }).exec();
				if (dbAsset) {
					return {
						name: dbAsset.name,
						type: dbAsset.type || null,
					};
				}
			}

			if (!dbAsset && symbol.includes('/')) {
				const cryptoSymbol = symbol.replace('/', '');
				dbAsset = await Stock.findOne({ symbol: cryptoSymbol }).exec();
				if (dbAsset) {
					return {
						name: dbAsset.name,
						type: dbAsset.type || null,
					};
				}
			}

			return { name: null, type: null };
		};
		const fetchDividendYield = async (symbol, currentPrice) => {
			try {
				const currentYear = new Date().getFullYear();
				const lastYear = currentYear - 1;

				const dividendResponse = await fetch(`https://api.polygon.io/v3/reference/dividends?ticker=${symbol}&limit=10&apiKey=${POLYGON_API_KEY}`);
				if (!dividendResponse.ok) {
					throw new Error(`Failed to fetch dividend data: ${dividendResponse.statusText}`);
				}
				const dividendData = await dividendResponse.json();

				const annualDividendAmountLastYear = dividendData.results.reduce((acc, dividend) => {
					const dividendYear = new Date(dividend.declaration_date).getFullYear();
					return dividendYear === lastYear ? acc + dividend.cash_amount : acc;
				}, 0);

				let annualDividendAmount = annualDividendAmountLastYear;
				if (annualDividendAmountLastYear === 0) {
					const yesterday = new Date();
					yesterday.setDate(yesterday.getDate() - 1);

					const dividendResponseThisYear = await fetch(`https://api.polygon.io/v3/reference/dividends?ticker=${symbol}&limit=10&apiKey=${POLYGON_API_KEY}`);
					if (!dividendResponseThisYear.ok) {
						throw new Error(`Failed to fetch dividend data for this year: ${dividendResponseThisYear.statusText}`);
					}
					const dividendDataThisYear = await dividendResponseThisYear.json();

					annualDividendAmount = dividendDataThisYear.results.reduce((acc, dividend) => {
						const dividendDate = new Date(dividend.declaration_date);
						if (dividendDate <= yesterday) {
							return acc + dividend.cash_amount;
						}
						return acc;
					}, 0);
				}

				// If no dividends were paid, return 0 dividend yield
				if (annualDividendAmount === 0 || !currentPrice) {
					return {
						annualDividendAmount: 0,
						closePrice: currentPrice || 0,
						dividendYield: 0
					};
				}

				// Calculate dividend yield using current price
				const dividendYield = (annualDividendAmount / currentPrice) * 100;

				return {
					annualDividendAmount,
					closePrice: currentPrice,
					dividendYield
				};
			} catch (error) {
				console.error('Error fetching dividend yield:', error);
				return null;
			}
		};



		const fetchNews = async (symbol) => {
			try {
				const url = `https://data.alpaca.markets/v1beta1/news?symbols=${symbol}&limit=10`;

				const response = await fetch(url, {
					headers: {
						'APCA-API-KEY-ID': ALPACA_API_KEY,
						'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
					},
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch news: ${response.statusText}`);
				}

				const newsData = await response.json();
				return newsData.news;
			} catch (error) {
				console.error('Error fetching news:', error);
				return [];
			}
		};

		// Determine if the symbol is for a stock or crypto
		const isCrypto = symbol.includes('/');
		const snapshot = await fetchSnapshot(symbol, isCrypto);
		const historicalData = await fetchHistoricalData(symbol, isCrypto);
		const assetDetails = await fetchAssetDetails(symbol);
		const newsData = await fetchNews(symbol);


		const snapshotData = isCrypto
			? snapshot.snapshots[symbol.replace('/', '%2F')]
			: snapshot[symbol];

		const currentPrice = snapshotData?.latestTrade?.p;
		const dividendYieldData = await fetchDividendYield(symbol, currentPrice);


		if (!snapshotData) {
			return NextResponse.json(
				{ success: false, message: 'Asset not found in Alpaca data.' },
				{ status: 404 }
			);
		}

		// Prepare response
		const responseData = {
			symbol,
			name: assetDetails.name,
			type: assetDetails.type || null,
			price: snapshotData.latestTrade.p,
			changePercent:
				((snapshotData.dailyBar.c - snapshotData.prevDailyBar.c) /
					snapshotData.prevDailyBar.c) *
				100,
			high: snapshotData.dailyBar.h,
			low: snapshotData.dailyBar.l,
			volume: snapshotData.dailyBar.v,
			vwap: snapshotData.dailyBar.vw,
			historicalData,
			dividends: dividendYieldData ? {
				annualDividendAmount: dividendYieldData.annualDividendAmount,
				currentPrice: dividendYieldData.currentPrice,
				dividendYield: dividendYieldData.dividendYield
			} : null,
			news: newsData,
		};



		return NextResponse.json({ success: true, data: responseData });
	} catch (error) {
		console.error('Error fetching data:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to fetch asset data.', details: error.message },
			{ status: 500 }
		);
	}
}
