import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';
import jwt from 'jsonwebtoken';

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const YH_FINANCE_KEY = process.env.YH_FINANCE_KEY;

function getUserIdFromToken(req) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            throw new Error('No token provided');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

export async function GET(req, { params }) {
    try {
        const userId = getUserIdFromToken(req);
        await connectToDatabase();

        const { symbol } = params;

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

        let currentPrice = 0;

        if (alpacaResponse.ok) {
            const priceData = await alpacaResponse.json();
            currentPrice = priceData[symbol]?.latestTrade?.p || 0;
        }

        // If no data from Alpaca, fetch from Yahoo Finance
        if (!currentPrice) {
            const yfinanceResponse = await fetch(
                `https://yfapi.net/v6/finance/quote?symbols=${symbol}`,
                {
                    headers: {
                        'X-API-KEY': YH_FINANCE_KEY,
                    },
                }
            );

            if (yfinanceResponse.ok) {
                const yData = await yfinanceResponse.json();
                currentPrice =
                    yData.quoteResponse.result[0]?.regularMarketPrice || 0;
            } else {
                throw new Error(
                    'Failed to fetch price data from both Alpaca and Yahoo Finance'
                );
            }
        }

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
        }, { status: error.message === 'Invalid token' ? 401 : 500 });
    }
}