import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';
import jwt from 'jsonwebtoken';


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

export async function GET(req, { params }) {
	try {
		const userId = getUserIdFromToken(req);
		await connectToDatabase();

		const { symbol } = params; 

		const portfolio = await Portfolio.findOne({
			userId,
			'holdings.symbol': symbol.toUpperCase()
		});

		if (!portfolio) {
			return NextResponse.json({
				success: false,
				message: `No holdings found for symbol ${symbol}`,
			}, { status: 404 });
		}

		// Filter out holdings for the specific symbol
		const symbolHoldings = portfolio.holdings.filter(h => h.symbol === symbol.toUpperCase());

		if (symbolHoldings.length === 0) {
            return NextResponse.json({
				success: false,
				message: `No holdings found for symbol ${symbol} after filtering.`,
			}, { status: 404 });
        }

		return NextResponse.json({
			success: true,
			data: {
				symbol: symbol.toUpperCase(),
				holdings: symbolHoldings, // Returns all individual buy transactions for this symbol
			}
		});

	} catch (error) {
		console.error(`Error fetching portfolio data for symbol ${params.symbol}:`, error);
		return NextResponse.json({
			success: false,
			message: error.message
		}, { status: error.message === 'Invalid token' ? 401 : 500 });
	}
}

export async function DELETE(req, { params }) {
    try {
        const userId = getUserIdFromToken(req);
        await connectToDatabase();
        const { symbol } = params;
        const { quantity: quantityToSell } = await req.json();

        if (!symbol || typeof quantityToSell !== 'number' || quantityToSell <= 0) {
            return NextResponse.json({ success: false, message: 'Symbol and valid quantity to sell are required.' }, { status: 400 });
        }

        const portfolio = await Portfolio.findOne({ userId });
        if (!portfolio) {
            return NextResponse.json({ success: false, message: 'Portfolio not found.' }, { status: 404 });
        }

        const holdingsForSymbol = portfolio.holdings
            .filter(h => h.symbol === symbol.toUpperCase())
            .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate)); // FIFO

        let totalSharesForSymbol = holdingsForSymbol.reduce((sum, h) => sum + h.shares, 0);

        if (totalSharesForSymbol < quantityToSell) {
            return NextResponse.json({ success: false, message: `Not enough shares to sell. You have ${totalSharesForSymbol} ${symbol.toUpperCase()} shares.` }, { status: 400 });
        }

        let remainingToSell = quantityToSell;
        const updatedHoldings = [];
        const allOtherHoldings = portfolio.holdings.filter(h => h.symbol !== symbol.toUpperCase());

        for (const holding of holdingsForSymbol) {
            if (remainingToSell <= 0) {
                updatedHoldings.push(holding);
                continue;
            }
            if (holding.shares > remainingToSell) {
                updatedHoldings.push({
                    ...holding.toObject(), 
                    shares: holding.shares - remainingToSell,
                });
                remainingToSell = 0;
            } else {
                remainingToSell -= holding.shares;
                // This lot is completely sold, do not add to updatedHoldings
            }
        }

        portfolio.holdings = [...allOtherHoldings, ...updatedHoldings];
        await portfolio.save();

        return NextResponse.json({ success: true, message: `${quantityToSell} shares of ${symbol.toUpperCase()} sold successfully.` });

    } catch (error) {
        console.error('Error selling stock:', error);
        if (error.message === 'Invalid token' || error.message === 'No token provided') {
            return NextResponse.json({ success: false, message: error.message }, { status: 401 });
        }
        return NextResponse.json({ success: false, message: 'Server error while selling stock' }, { status: 500 });
    }
}