import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';
import jwt from 'jsonwebtoken';

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const YH_FINANCE_KEY = process.env.YH_KEY;

// Cache for stock prices
const priceCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

	const yahooExchangeMap = {
		'.US': '',     // No suffix for US stocks
		'.ES': '.MC',  // Madrid
		'.IT': '.MI',  // Milan
		'.PL': '.WA',  // Warsaw
		'.UK': '.L',   // London
		'.FR': '.PA',  // Paris
		'.DE': '.DE',  // Germany
		'.NL': '.AS'   // Amsterdam
	};
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
    console.log(`[FetchPrices] Requested symbols: ${symbols.join(', ')}`);
    const pricesToReturn = {}; // This will hold the prices for the current request, from cache or fresh fetch.
    const symbolsToActuallyFetch = [];

    // Phase 1: Check cache for all symbols
    for (const symbol of symbols) {
        if (priceCache.has(symbol)) {
            const cachedEntry = priceCache.get(symbol);
            if (Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
                pricesToReturn[symbol] = { price: cachedEntry.price, currency: cachedEntry.currency };
                console.log(`[Cache] Used cached price for ${symbol}:`, pricesToReturn[symbol]);
            } else {
                symbolsToActuallyFetch.push(symbol); // Expired
                priceCache.delete(symbol); // Remove expired entry
                console.log(`[Cache] Expired cache for ${symbol}`);
            }
        } else {
            symbolsToActuallyFetch.push(symbol); // Not in cache
            console.log(`[Cache] No cache for ${symbol}`);
        }
    }

    if (symbolsToActuallyFetch.length === 0 && symbols.length > 0) {
        console.log('[FetchPrices] All requested prices served from cache.');
        return pricesToReturn;
    }
    if (symbolsToActuallyFetch.length > 0) {
       console.log(`[FetchPrices] Cache miss or expired for: ${symbolsToActuallyFetch.join(', ')}. Attempting fetch...`);
    }

    const alpacaFetchedSymbols = new Set();

    // Phase 2: Fetch from Alpaca for symbols in symbolsToActuallyFetch
    if (symbolsToActuallyFetch.length > 0) {
        try {
            const alpacaQuerySymbols = symbolsToActuallyFetch.join(',');
            console.log(`[Alpaca] Querying for: ${alpacaQuerySymbols}`);
            const alpacaResponse = await fetch(
                `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${alpacaQuerySymbols}`,
                { headers: { 'APCA-API-KEY-ID': ALPACA_API_KEY, 'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY } }
            );

            if (alpacaResponse.ok) {
                const alpacaData = await alpacaResponse.json();
                for (const symbol of symbolsToActuallyFetch) { 
                    if (alpacaData[symbol]?.latestTrade?.p) {
                        const price = alpacaData[symbol].latestTrade.p;
                        pricesToReturn[symbol] = { price, currency: 'USD' };
                        priceCache.set(symbol, { price, currency: 'USD', timestamp: Date.now() });
                        alpacaFetchedSymbols.add(symbol);
                        console.log(`[Alpaca] Fetched and cached price for ${symbol}:`, pricesToReturn[symbol]);
                    }
                }
            } else {
                console.log(`[Alpaca] API error: ${alpacaResponse.status} - ${await alpacaResponse.text()}`);
            }
        } catch (error) {
            console.error('[Alpaca] Fetch error:', error.message);
        }
    }

    // Phase 3: Fetch from Yahoo Finance for symbols not fetched by Alpaca
    const yahooCandidateSymbols = symbolsToActuallyFetch.filter(s => !alpacaFetchedSymbols.has(s));

    if (yahooCandidateSymbols.length > 0) {
        console.log(`[Yahoo] Candidate symbols: ${yahooCandidateSymbols.join(', ')}`);
        for (const symbol of yahooCandidateSymbols) {
            let yahooQuerySymbol = symbol;
            const parts = symbol.split('.');
            if (parts.length > 1) {
                const suffix = '.' + parts.pop();
                const prefix = parts.join('.');
                if (yahooExchangeMap[suffix.toUpperCase()]) {
                    yahooQuerySymbol = prefix + yahooExchangeMap[suffix.toUpperCase()];
                    console.log(`[Yahoo] Mapped ${symbol} to ${yahooQuerySymbol} for Yahoo Finance.`);
                }
            }
            
            console.log(`[Yahoo] Trying Yahoo Finance with symbol: ${yahooQuerySymbol}`);
            try {
                const yahooResponse = await fetch(
                    `https://yfapi.net/v6/finance/quote?symbols=${yahooQuerySymbol}`,
                    { headers: { 'X-API-KEY': YH_FINANCE_KEY } }
                );

                if (yahooResponse.ok) {
                    const yahooData = await yahooResponse.json();
                    const quote = yahooData.quoteResponse?.result?.[0];
                    if (quote?.regularMarketPrice) {
                        const price = quote.regularMarketPrice;
                        const currency = quote.currency || 'USD';
                        pricesToReturn[symbol] = { price, currency };
                        priceCache.set(symbol, { price, currency, timestamp: Date.now() });
                        console.log(`[Yahoo] Fetched and cached price for ${symbol} (using ${yahooQuerySymbol}):`, pricesToReturn[symbol]);
                    } else {
                        console.log(`[Yahoo] No regularMarketPrice for ${yahooQuerySymbol} in response. Quote:`, quote);
                    }
                } else {
                    console.log(`[Yahoo] API error for ${yahooQuerySymbol}: ${yahooResponse.status} - ${await yahooResponse.text()}`);
                }
            } catch (error) {
                console.error(`[Yahoo] Fetch error for ${yahooQuerySymbol}:`, error.message);
            }
        }
    }

    // Final step: Ensure all original symbols requested have an entry in pricesToReturn.
    // If a symbol was requested but not found in cache and fetching failed, provide a default.
    for (const originalSymbol of symbols) {
        if (!pricesToReturn[originalSymbol]) {
            console.warn(`[FetchPrices] No price retrieved for ${originalSymbol}. Defaulting to 0 USD.`);
            pricesToReturn[originalSymbol] = { price: 0, currency: 'USD' }; // Default if all attempts fail
        }
    }
    
    console.log('[FetchPrices] Returning final prices for this run:', pricesToReturn);
    return pricesToReturn;
}

async function getExchangeRates() {
	try {
		// Using a more reliable and free API for exchange rates
		const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
		if (!response.ok) {
			console.error(`Error fetching exchange rates: ${response.status} ${response.statusText}`);
			// Fallback or default rates if API fails
			return { 'EUR': 0.93, 'USD': 1, 'PLN': 4.0, 'GBP': 0.8 }; // Example fallback
		}
		const data = await response.json();
		if (data && data.rates) {
			return data.rates;
		} else {
			console.error('Error fetching exchange rates: Invalid data format');
			return { 'EUR': 0.93, 'USD': 1, 'PLN': 4.0, 'GBP': 0.8 }; // Example fallback
		}
	} catch (error) {
		console.error('Error fetching exchange rates:', error);
		return { 'EUR': 0.93, 'USD': 1, 'PLN': 4.0, 'GBP': 0.8 }; // Example fallback in case of network or other errors
	}
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
				summary: {
					totalInvestmentInEUR: 0,
					currentTotalValueInEUR: 0,
					totalProfitLossInEUR: 0,
					percentageReturn: 0
				}
			});
		}

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
			holdingsBySymbol[symbol].aggregatedTotalCostInEUR += holding.costInEUR * holding.shares;
            holdingsBySymbol[symbol].transactions.push(holding); 
		});

		const symbols = Object.keys(holdingsBySymbol);
		const prices = await fetchStockPrices(symbols); 
		const exchangeRates = await getExchangeRates();

		const aggregatedHoldings = symbols.map(symbolKey => {
			const holdingAgg = holdingsBySymbol[symbolKey];
			const priceData = prices[symbolKey]; 

			let currentPriceInEUR = 0;
			if (priceData && typeof priceData.price === 'number' && priceData.price > 0 && exchangeRates) {
				if (priceData.currency === 'EUR') {
					currentPriceInEUR = priceData.price;
				} else if (exchangeRates[priceData.currency] && exchangeRates['EUR']) {
                    const priceInUSD = priceData.price / exchangeRates[priceData.currency];
					currentPriceInEUR = priceInUSD * exchangeRates['EUR'];
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

		let globalTotalInvestmentInEUR = 0;
		let globalCurrentTotalValueInEUR = 0;
		aggregatedHoldings.forEach(h => {
			globalTotalInvestmentInEUR += h.totalInvestmentInEUR;
			globalCurrentTotalValueInEUR += h.currentTotalValueInEUR;
		});
		const globalTotalProfitLossInEUR = globalCurrentTotalValueInEUR - globalTotalInvestmentInEUR;
		const globalPercentageReturn = globalTotalInvestmentInEUR > 0 ? (globalTotalProfitLossInEUR / globalTotalInvestmentInEUR) * 100 : 0;

		console.log('API returning aggregatedHoldings:', JSON.stringify(aggregatedHoldings, null, 2)); 
		console.log('API returning summary:', JSON.stringify({globalTotalInvestmentInEUR, globalCurrentTotalValueInEUR, globalTotalProfitLossInEUR, globalPercentageReturn}, null, 2));

		return NextResponse.json({
			success: true,
			data: aggregatedHoldings,
			summary: {
				totalInvestmentInEUR: globalTotalInvestmentInEUR,
				currentTotalValueInEUR: globalCurrentTotalValueInEUR,
				totalProfitLossInEUR: globalTotalProfitLossInEUR,
				percentageReturn: globalPercentageReturn
			}
		});
	} catch (error) {
		console.error('Error fetching portfolio:', error);
		return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
	}
}

export async function POST(req) {
    try {
        const userId = getUserIdFromToken(req);
        await connectToDatabase();

        const { symbol, shares, costPerShare, purchaseDate, currency, notes } = await req.json();

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

        if (currency === 'EUR') {
            costInEUR = costPerShare;
        } else if (exchangeRates && exchangeRates[currency] && exchangeRates['EUR']) {
            const costInUSD = costPerShare / exchangeRates[currency];
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
            shares,
            costPerShare, 
            costInEUR,    
            tradingCurrency: currency,
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
        if (error.message === 'Invalid token' || error.message === 'No token provided') {
            return NextResponse.json({ success: false, message: error.message }, { status: 401 });
        }
        return NextResponse.json({ success: false, message: 'Server error while adding stock' }, { status: 500 });
    }
}