import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Stock from '@/app/models/Stock';

export async function GET(req) {
	try {
		await connectToDatabase();

		// Define symbols for stocks, cryptos, and ETFs
		const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'BRK.B', 'JPM', 'JNJ'];
		const cryptoSymbols = ['BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD', 'BCH/USD'];
		const etfSymbols = ['SPY', 'QQQ', 'DIA', 'IVV', 'VOO'];

		// Fetch data from Alpaca API
		const fetchSnapshots = async (symbols, isCrypto = false) => {
			let baseUrl;
			if (isCrypto) {
				baseUrl = 'https://data.alpaca.markets/v1beta3/crypto/us/snapshots';
				symbols = symbols.map(symbol => symbol.replace('/', '%2F'));
			} else {
				baseUrl = 'https://data.alpaca.markets/v2/stocks/snapshots';
			}

			const url = `${baseUrl}?symbols=${symbols.join(',')}`;

			const response = await fetch(url, {
				headers: {
					'APCA-API-KEY-ID': process.env.ALPACA_KEY,
					'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
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
					'APCA-API-KEY-ID': process.env.ALPACA_KEY,
					'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
				},
			});


			if (!response.ok) {
				throw new Error(`API Error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			return data.bars[symbol] || [];
		};

		const fetchAssetDetails = async (symbol) => {

			// Search the database first
			var dbAsset = await Stock.findOne({ symbol }).exec();

			if (dbAsset) {
				return {
					name: dbAsset.name,
					currency: dbAsset.currency || null,
				};
			}

			if (!dbAsset && symbol.includes('.')) {
				// Try with hyphen if dot symbol is not found
				const hyphenSymbol = symbol.replace('.', '-');
				dbAsset = await Stock.findOne({ hyphenSymbol }).exec();
				if (dbAsset) {
					return {
						name: dbAsset.name,
						currency: dbAsset.currency || null,
					};
				}
			}

			if (!dbAsset && symbol.includes('/')) {
				const cryptoSymbol = symbol.replace('/', '');
				dbAsset = await Stock.findOne({ cryptoSymbol }).exec();
				if (dbAsset) {
					return {
						name: dbAsset.name,
						currency: dbAsset.currency || null,
					};
				}
			}
			return dbAsset || { name: null, currency: null };
		};

		const [stockSnapshots, cryptoSnapshots, etfSnapshots] = await Promise.all([
			fetchSnapshots(stockSymbols),
			fetchSnapshots(cryptoSymbols, true),
			fetchSnapshots(etfSymbols),
		]);

		// Process and sort assets by performance (percentage change)
		const processSnapshots = async (snapshots, type, isCrypto = false) => {
			const assets = await Promise.all(
				Object.entries(isCrypto ? snapshots.snapshots : snapshots).map(async ([symbol, snapshot]) => {
					try {
						// Add null checks for all properties
						const assetDetails = await fetchAssetDetails(symbol);
						const historicalData = await fetchHistoricalData(symbol, isCrypto);

						// Ensure snapshot and its properties exist
						if (!snapshot || !snapshot.latestTrade || !snapshot.dailyBar || !snapshot.prevDailyBar) {
							console.log(`Missing data for ${symbol}:`, snapshot);
							return null;
						}

						const price = snapshot.latestTrade?.p || 0;
						const dailyClose = snapshot.dailyBar?.c || 0;
						const prevClose = snapshot.prevDailyBar?.c || 0;

						console.table(snapshot)

						return {
							symbol,
							name: assetDetails.name || symbol,
							type,
							currency: assetDetails.currency || null,
							price: price || 0,
							changePercent: prevClose ? ((dailyClose - prevClose) / prevClose) * 100 : 0,
							high: snapshot.dailyBar?.h || price,
							low: snapshot.dailyBar?.l || price,
							volume: snapshot.dailyBar?.v || 0,
							vwap: snapshot.dailyBar?.vw || price,
							historicalData,
						};
					} catch (error) {
						console.error(`Error processing ${symbol}:`, error);
						return null;
					}
				})
			);

			// Filter out null values and sort
			return assets
				.filter(asset => asset !== null)
				.sort((a, b) => b.changePercent - a.changePercent);
		};

		const topStocks = (await processSnapshots(stockSnapshots, 'Stock')).slice(0, 10);
		const topCryptos = (await processSnapshots(cryptoSnapshots, 'Cryptocurrency', true)).slice(0, 5);
		const topETFs = (await processSnapshots(etfSnapshots, 'ETF')).slice(0, 5);

		const response = NextResponse.json({
			success: true,
			data: {
				stocks: topStocks,
				cryptocurrencies: topCryptos,
				etfs: topETFs,
			},
		});
		return response;
	} catch (error) {
		console.error('Error fetching data:', error);
		return NextResponse.json({
			success: false,
			message: 'Failed to fetch top assets.',
		}, { status: 500 });
	}
}
