import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;

export async function GET(req) {
	try {
		await connectToDatabase();
		const userId = req.headers.get('user-id');

		// Get portfolio from DB
		const portfolio = await Portfolio.findOne({ userId });
		if (!portfolio) return NextResponse.json({ success: true, data: [] });

		// Group holdings by symbol and calculate aggregated data
		const holdingsBySymbol = {};

		portfolio.holdings.forEach(holding => {
			const symbol = holding.symbol;
			if (!holdingsBySymbol[symbol]) {
				holdingsBySymbol[symbol] = {
					symbol,
					totalShares: 0,
					totalCost: 0,
				};
			}
			holdingsBySymbol[symbol].totalShares += holding.shares;
			holdingsBySymbol[symbol].totalCost += holding.shares * holding.costPerShare;
		});

		const symbols = Object.keys(holdingsBySymbol);

		// Fetch current prices from Alpaca
		const alpacaResponse = await fetch(
			`https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbols.join(',')}`,
			{
				headers: {
					'APCA-API-KEY-ID': ALPACA_API_KEY,
					'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
				},
			}
		);

		if (!alpacaResponse.ok) {
			throw new Error('Failed to fetch current prices');
		}

		const priceData = await alpacaResponse.json();

		// Calculate weighted average cost per share and other metrics
		const aggregatedHoldings = symbols.map(symbol => {
			const holding = holdingsBySymbol[symbol];
			const currentPrice = priceData[symbol]?.latestTrade?.p || 0;

			const avgCostPerShare = holding.totalCost / holding.totalShares;
			const totalValue = holding.totalShares * currentPrice;
			const totalProfitLoss = totalValue - holding.totalCost;
			const percentageReturn = (totalProfitLoss / holding.totalCost) * 100;

			return {
				symbol,
				totalShares: holding.totalShares,
				avgCostPerShare,
				currentPrice,
				totalValue,
				totalProfitLoss,
				percentageReturn,
			};
		});

		return NextResponse.json({
			success: true,
			data: aggregatedHoldings,
		});
	} catch (error) {
		console.error('Error fetching portfolio:', error);
		return NextResponse.json(
			{
				success: false,
				message: error.message,
			},
			{ status: 500 }
		);
	}
}