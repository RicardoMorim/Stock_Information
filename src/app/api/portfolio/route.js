import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';
import { getUserIdFromToken } from '@/app/utils/serverAuthUtils'; // Refactored
import { fetchStockPrices, getExchangeRates } from '@/app/utils/portfolioUtils'; // Refactored

// Helper function to calculate portfolio summary
export function calculatePortfolioSummary(aggregatedHoldings) {
    let globalTotalInvestmentInEUR = 0;
    let globalCurrentTotalValueInEUR = 0;

    aggregatedHoldings.forEach(h => {
        globalTotalInvestmentInEUR += h.totalInvestmentInEUR;
        globalCurrentTotalValueInEUR += h.currentTotalValueInEUR;
    });

    const globalTotalProfitLossInEUR = globalCurrentTotalValueInEUR - globalTotalInvestmentInEUR;
    const globalPercentageReturn = globalTotalInvestmentInEUR > 0 ? (globalTotalProfitLossInEUR / globalTotalInvestmentInEUR) * 100 : 0;

    return {
        totalInvestmentInEUR: globalTotalInvestmentInEUR,
        currentTotalValueInEUR: globalCurrentTotalValueInEUR,
        totalProfitLossInEUR: globalTotalProfitLossInEUR,
        percentageReturn: globalPercentageReturn
    };
}

// Helper function to aggregate holdings from portfolio data
export function aggregatePortfolioHoldings(portfolio) {
    const holdingsBySymbol = {};
    portfolio.holdings.forEach(holding => {
        const symbol = holding.symbol;
        if (!holdingsBySymbol[symbol]) {
            holdingsBySymbol[symbol] = {
                symbol,
                name: holding.name || symbol, 
                totalShares: 0,
                aggregatedTotalCostInEUR: 0, 
                transactions: [] 
            };
        }
        holdingsBySymbol[symbol].totalShares += holding.shares;
        // Ensure costInEUR is a number before multiplying
        const costInEUR = typeof holding.costInEUR === 'number' ? holding.costInEUR : 0;
        const shares = typeof holding.shares === 'number' ? holding.shares : 0;
        holdingsBySymbol[symbol].aggregatedTotalCostInEUR += costInEUR * shares;
        holdingsBySymbol[symbol].transactions.push(holding); 
    });
    return holdingsBySymbol;
}

// Helper function to process holdings with current prices and exchange rates
export function processHoldingsWithMarketData(holdingsBySymbol, prices, exchangeRates) {
    const symbols = Object.keys(holdingsBySymbol);
    return symbols.map(symbolKey => {
        const holdingAgg = holdingsBySymbol[symbolKey];
        const priceData = prices[symbolKey]; 

        let currentPriceInEUR = 0;
        if (priceData && typeof priceData.price === 'number' && priceData.price > 0 && exchangeRates) {
            if (priceData.currency === 'EUR') {
                currentPriceInEUR = priceData.price;
            } else if (exchangeRates[priceData.currency] && exchangeRates['EUR']) {
                const priceInBaseCurrency = priceData.price / exchangeRates[priceData.currency]; // Convert to USD first if rates are USD based
                currentPriceInEUR = priceInBaseCurrency * exchangeRates['EUR'];
            } else {
                console.warn(`Could not convert price for ${symbolKey} from ${priceData.currency} to EUR. Rates or currency missing.`);
            }
        }

        const totalShares = holdingAgg.totalShares || 0;
        const totalInvestmentForHoldingInEUR = holdingAgg.aggregatedTotalCostInEUR || 0;
        const avgCostPerShareInEUR = totalShares > 0 ? totalInvestmentForHoldingInEUR / totalShares : 0;
        const currentTotalValueInEUR = totalShares * currentPriceInEUR;
        const totalProfitLossInEUR = currentTotalValueInEUR - totalInvestmentForHoldingInEUR;
        const percentageReturn = totalInvestmentForHoldingInEUR > 0 ? (totalProfitLossInEUR / totalInvestmentForHoldingInEUR) * 100 : 0;

        return {
            symbol: symbolKey,
            name: holdingAgg.name,
            totalShares,
            avgCostPerShareInEUR: avgCostPerShareInEUR,
            currentPriceInEUR: currentPriceInEUR,
            currentTotalValueInEUR: currentTotalValueInEUR,
            totalInvestmentInEUR: totalInvestmentForHoldingInEUR,
            totalProfitLossInEUR: totalProfitLossInEUR,
            percentageReturn,
            transactions: holdingAgg.transactions 
        };
    });
}

export async function GET(req) {
	try {
		const userId = getUserIdFromToken(req);
		await connectToDatabase();

		const portfolio = await Portfolio.findOne({ userId });

		if (!portfolio || portfolio.holdings.length === 0) {
			return NextResponse.json({
				success: true,
				data: [],
				summary: { totalInvestmentInEUR: 0, currentTotalValueInEUR: 0, totalProfitLossInEUR: 0, percentageReturn: 0 }
			});
		}

		const holdingsBySymbol = aggregatePortfolioHoldings(portfolio);
		const symbols = Object.keys(holdingsBySymbol);
		
        // Parallel fetch of prices and exchange rates
        const [prices, exchangeRates] = await Promise.all([
            fetchStockPrices(symbols),
            getExchangeRates()
        ]);

		const aggregatedHoldings = processHoldingsWithMarketData(holdingsBySymbol, prices, exchangeRates);
		const summary = calculatePortfolioSummary(aggregatedHoldings);

		console.log('API returning aggregatedHoldings:', JSON.stringify(aggregatedHoldings, null, 2)); 
		console.log('API returning summary:', JSON.stringify(summary, null, 2));

		return NextResponse.json({
			success: true,
			data: aggregatedHoldings,
			summary
		});
	} catch (error) {
		console.error('Error fetching portfolio:', error);
        const status = error.message === 'Invalid token' || error.message === 'No token provided' || error.message === 'No token provided or token is malformed' ? 401 : 500;
		return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status });
	}
}

export async function POST(req) {
    try {
        const userId = getUserIdFromToken(req);
        await connectToDatabase();

        const { symbol, shares, costPerShare, purchaseDate, currency, notes, name } = await req.json(); // Added name

        // Validate input
        if (!symbol || !shares || !costPerShare || !purchaseDate || !currency) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }
        if (typeof shares !== 'number' || shares <= 0) {
            return NextResponse.json({ success: false, message: 'Shares must be a positive number' }, { status: 400 });
        }
        if (typeof costPerShare !== 'number' || costPerShare <= 0) {
            return NextResponse.json({ success: false, message: 'Cost per share must be a positive number' }, { status: 400 });
        }

        const exchangeRates = await getExchangeRates();
        let costInEUR;

        if (currency.toUpperCase() === 'EUR') {
            costInEUR = costPerShare;
        } else if (exchangeRates && exchangeRates[currency.toUpperCase()] && exchangeRates['EUR']) {
            // Assuming exchangeRates are relative to USD. Convert original currency to USD, then USD to EUR.
            const costInUSD = costPerShare / exchangeRates[currency.toUpperCase()];
            costInEUR = costInUSD * exchangeRates['EUR'];
        } else {
            console.error(`Could not convert ${costPerShare} ${currency} to EUR. Exchange rate not found for ${currency}. Available rates:`, exchangeRates);
            return NextResponse.json({ success: false, message: `Failed to convert ${currency} to EUR. Exchange rate not found.` }, { status: 400 });
        }

        if (isNaN(costInEUR) || costInEUR <=0) {
            console.error(`Calculated costInEUR is invalid: ${costInEUR}`);
            return NextResponse.json({ success: false, message: 'Calculated cost in EUR is invalid.' }, { status: 400 });
        }

        const newHolding = {
            symbol: symbol.toUpperCase(),
            name: name || symbol.toUpperCase(), // Use provided name or default to symbol
            shares,
            costPerShare, 
            costInEUR,    
            tradingCurrency: currency.toUpperCase(),
            purchaseDate: new Date(purchaseDate),
            notes: notes || ''
        };

        const portfolio = await Portfolio.findOneAndUpdate(
            { userId },
            { $push: { holdings: newHolding } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json({ success: true, data: portfolio });

    } catch (error) {
        console.error('Error adding stock to portfolio:', error);
        const status = error.message === 'Invalid token' || error.message === 'No token provided' || error.message === 'No token provided or token is malformed' ? 401 : 500;
        return NextResponse.json({ success: false, message: error.message || 'Server error while adding stock' }, { status });
    }
}