import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';
import jwt from 'jsonwebtoken';

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const YH_FINANCE_KEY = process.env.YH_KEY;

function getUserIdFromToken(req) {
	try {
		const authHeader = req.headers.get('authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			throw new Error('No token provided');
		}

		const token = authHeader.split(' ')[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		return decoded.id;
	} catch (error) {
		throw new Error('Invalid token');
	}
}

async function fetchStockPrices(symbols) {
	const prices = {};

	// Try Alpaca first
	const alpacaResponse = await fetch(
		`https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbols.join(',')}`,
		{
			headers: {
				'APCA-API-KEY-ID': ALPACA_API_KEY,
				'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
			},
		}
	);

	if (alpacaResponse.ok) {
		const alpacaData = await alpacaResponse.json();
		for (const symbol of symbols) {
			if (alpacaData[symbol]?.latestTrade?.p) {
				prices[symbol] = {
					price: alpacaData[symbol].latestTrade.p,
					currency: 'USD' // Alpaca always returns USD
				};
			}
		}
	}

	const exchangeMap = {
		'US': '',     // No suffix for US stocks
		'ES': '.MC',  // Madrid
		'IT': '.MI',  // Milan
		'PL': '.WA',  // Warsaw
		'UK': '.L',   // London
		'FR': '.PA',  // Paris
		'DE': '.DE',  // Germany
		'NL': '.AS'   // Amsterdam
	};

	// For any symbols not found in Alpaca, try Yahoo Finance
	const missingSymbols = symbols.filter(symbol => !prices[symbol]);
	if (missingSymbols.length > 0) {
		for (const symbol of missingSymbols) {
			const [base, exchange] = symbol.split('.');
			const yahooSuffix = exchange ? exchangeMap[exchange] : '';
			const yahooSymbol = base + (yahooSuffix || '');

			console.log(`Trying Yahoo Finance with symbol: ${yahooSymbol}`);

			const yahooResponse = await fetch(
				`https://yfapi.net/v6/finance/quote?symbols=${yahooSymbol}`,
				{
					headers: {
						'X-API-KEY': YH_FINANCE_KEY,
					},
				}
			);

			if (yahooResponse.ok) {
				const yahooData = await yahooResponse.json();
				const quote = yahooData.quoteResponse?.result?.[0];

				if (quote?.regularMarketPrice) {
					prices[symbol] = {
						price: quote.regularMarketPrice,
						currency: quote.currency || 'USD'
					};
					console.log(`Found price for ${symbol}: `, prices[symbol]);
				}
			}
		}
	}

	console.log('Final prices:', prices);
	return prices;
}

async function getExchangeRates() {
	try {
		const response = await fetch('https://open.er-api.com/v6/latest/USD');
		const data = await response.json();
		return data.rates;
	} catch (error) {
		console.error('Error fetching exchange rates:', error);
		return null;
	}
}

export async function GET(req) {
	try {
		const userId = getUserIdFromToken(req);
		await connectToDatabase();

		const portfolio = await Portfolio.findOne({ userId });
		console.log("Raw portfolio data:", portfolio);

		if (!portfolio) {
			const newPortfolio = new Portfolio({ userId, holdings: [] });
			await newPortfolio.save();
			return NextResponse.json({ success: true, data: [] });
		}

		// Initialize holdings aggregation
		const holdingsBySymbol = {};

		portfolio.holdings.forEach(holding => {
			const symbol = holding.symbol;
			if (!holdingsBySymbol[symbol]) {
				holdingsBySymbol[symbol] = {
					symbol,
					totalShares: 0,
					totalCost: 0,
					costInEUR: holding.costInEUR, // Use costInEUR from the schema
					tradingCurrency: holding.tradingCurrency
				};
			}

			// Aggregate holdings
			holdingsBySymbol[symbol].totalShares += holding.shares;
			holdingsBySymbol[symbol].totalCost += holding.shares * holding.costPerShare;
		});

		console.log("Holdings by symbol:", holdingsBySymbol);

		// Fetch current prices and exchange rates
		const symbols = Object.keys(holdingsBySymbol);
		const prices = await fetchStockPrices(symbols);
		const exchangeRates = await getExchangeRates();

		// Calculate metrics for each holding
		const aggregatedHoldings = symbols.map(symbol => {
			const holding = holdingsBySymbol[symbol];
			const priceData = prices[symbol] || { price: 0, currency: 'USD' };

			// Convert price to EUR
			let currentPriceEUR;
			if (priceData.currency === 'EUR') {
				currentPriceEUR = priceData.price;
			} else {
				// Convert from source currency to EUR
				currentPriceEUR = exchangeRates ?
					(priceData.price / exchangeRates[priceData.currency] * exchangeRates['EUR']) : 0;
			}

			const totalShares = holding.totalShares || 0;
			const avgCostPerShare = holding.costInEUR || 0;
			const totalValueEUR = totalShares * currentPriceEUR;
			const totalCostEUR = totalShares * avgCostPerShare;
			const totalProfitLoss = totalValueEUR - totalCostEUR;
			const percentageReturn = totalCostEUR > 0 ?
				(totalProfitLoss / totalCostEUR) * 100 : 0;

			return {
				symbol,
				totalShares,
				avgCostPerShare,
				currentPrice: currentPriceEUR,
				totalValue: totalValueEUR,
				totalCost: totalCostEUR,
				totalProfitLoss,
				percentageReturn,
				tradingCurrency: 'EUR'
			};
		});

		return NextResponse.json({
			success: true,
			data: aggregatedHoldings
		});

	} catch (error) {
		console.error('Error fetching portfolio:', error);
		return NextResponse.json(
			{ success: false, message: error.message },
			{ status: error.message === 'Invalid token' ? 401 : 500 }
		);
	}
}

export async function POST(req) {
	try {
		const userId = getUserIdFromToken(req);
		await connectToDatabase();
		const body = await req.json();

		// Validate required fields
		const { symbol, shares, costPerShare, currency, purchaseDate } = body;
		if (!symbol || !shares || !costPerShare || !purchaseDate || !currency) {
			return NextResponse.json({
				success: false,
				message: 'Missing required fields'
			}, { status: 400 });
		}

		// Add logging to debug the values
		console.log('Received values:', { symbol, shares, costPerShare, currency, purchaseDate });

		// Get exchange rates
		const exchangeRates = await getExchangeRates();
		if (!exchangeRates) {
			return NextResponse.json({
				success: false,
				message: 'Failed to fetch exchange rates'
			}, { status: 500 });
		}

		// Calculate EUR values for new position
		const newShares = Number(shares);
		const costInOriginalCurrency = Number(costPerShare);
		const costInEUR = costInOriginalCurrency / exchangeRates[currency] * exchangeRates['EUR'];

		// Find or create portfolio
		let portfolio = await Portfolio.findOne({ userId });
		if (!portfolio) {
			portfolio = new Portfolio({ userId, holdings: [] });
		}

		// Ensure symbol is uppercase and validate
		const normalizedSymbol = symbol.toUpperCase().trim();
		if (!normalizedSymbol) {
			return NextResponse.json({
				success: false,
				message: 'Invalid symbol'
			}, { status: 400 });
		}

		// Check if symbol already exists in holdings
		const existingHoldingIndex = portfolio.holdings.findIndex(h => h.symbol === normalizedSymbol);

		if (existingHoldingIndex !== -1) {
			// Calculate weighted average for existing position
			const existingHolding = portfolio.holdings[existingHoldingIndex];
			const totalShares = existingHolding.shares + newShares;
			const weightedCostInEUR = (
				(existingHolding.costInEUR * existingHolding.shares) +
				(costInEUR * newShares)
			) / totalShares;

			// Update existing holding
			portfolio.holdings[existingHoldingIndex] = {
				...existingHolding,
				symbol: normalizedSymbol, // Ensure symbol is set
				shares: totalShares,
				costInEUR: weightedCostInEUR,
				costPerShare: weightedCostInEUR,
				tradingCurrency: 'EUR',
				purchaseDate: new Date(),
				notes: body.notes || existingHolding.notes
			};
		} else {
			// Add new holding with explicit symbol
			portfolio.holdings.push({
				symbol: normalizedSymbol,
				shares: newShares,
				costPerShare: costInOriginalCurrency,
				costInEUR: costInEUR,
				tradingCurrency: currency,
				purchaseDate: new Date(purchaseDate),
				notes: body.notes || ''
			});
		}

		// Add validation before saving
		if (!portfolio.holdings.every(h => h.symbol)) {
			return NextResponse.json({
				success: false,
				message: 'Invalid holdings data: missing symbol'
			}, { status: 400 });
		}

		// Save and log the portfolio before saving
		console.log('Portfolio to save:', JSON.stringify(portfolio, null, 2));
		await portfolio.save();

		return NextResponse.json({
			success: true,
			message: 'Position added successfully'
		});

	} catch (error) {
		console.error('Error adding position:', error);
		return NextResponse.json({
			success: false,
			message: error.message
		}, { status: error.message === 'Invalid token' ? 401 : 500 });
	}
}