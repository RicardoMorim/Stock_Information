import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;

export async function GET(req, { params }) {
	try {
		await connectToDatabase();
		const { symbol } = await params;
		const userId = req.headers.get('user-id');

		// Fetch current price from Alpaca
		const alpacaResponse = await fetch(
			`https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbol}`,
			{
				headers: {
					'APCA-API-KEY-ID': ALPACA_API_KEY,
					'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
				},
			}
		);

		if (!alpacaResponse.ok) {
			throw new Error('Failed to fetch current price');
		}

		const priceData = await alpacaResponse.json();
		const currentPrice = priceData[symbol]?.latestTrade?.p || 0;

		// Get portfolio holdings for this symbol
		const portfolio = await Portfolio.findOne({
			userId,
			'holdings.symbol': symbol
		});

		if (!portfolio) {
			return NextResponse.json({
				success: true,
				data: {
					symbol,
					currentPrice,
					holdings: [],
					totalShares: 0,
					totalInvestment: 0,
					totalValue: 0,
					totalProfit: 0,
					averageReturn: 0
				}
			});
		}

		// Calculate metrics for each holding of this symbol
		const symbolHoldings = portfolio.holdings
			.filter(h => h.symbol === symbol)
			.map(holding => {
				const profitLoss = (currentPrice - holding.costPerShare) * holding.shares;
				const percentageReturn = ((currentPrice / holding.costPerShare - 1) * 100);
				const currentValue = currentPrice * holding.shares;

				return {
					id: holding._id,
					purchaseDate: holding.purchaseDate,
					shares: holding.shares,
					costPerShare: holding.costPerShare,
					notes: holding.notes,
					currentPrice,
					currentValue,
					profitLoss,
					percentageReturn
				};
			});

		// Calculate aggregated metrics
		const totalShares = symbolHoldings.reduce((sum, h) => sum + h.shares, 0);
		const totalInvestment = symbolHoldings.reduce((sum, h) => sum + (h.shares * h.costPerShare), 0);
		const totalValue = totalShares * currentPrice;
		const totalProfit = totalValue - totalInvestment;
		const averageReturn = (totalProfit / totalInvestment) * 100;

		return NextResponse.json({
			success: true,
			data: {
				symbol,
				currentPrice,
				holdings: symbolHoldings,
				totalShares,
				totalInvestment,
				totalValue,
				totalProfit,
				averageReturn
			}
		});

	} catch (error) {
		console.error('Error fetching portfolio data:', error);
		return NextResponse.json({
			success: false,
			message: error.message
		}, { status: 500 });
	}
}