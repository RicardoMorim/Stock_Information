import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Stock from '@/app/models/Stock';

export async function GET(req) {
	const { searchParams } = new URL(req.url);
	const query = searchParams.get('query');

	if (!query) {
		return NextResponse.json({
			success: false,
			message: 'Query parameter is required.',
		}, { status: 400 });
	}

	try {
		// Connect to the database
		await connectToDatabase();

		// Search the database for stocks with the query in the name or symbol
		const results = await Stock.find({
			$or: [
				{ name: { $regex: query, $options: 'i' } },
				{ symbol: { $regex: query, $options: 'i' } },
			],
		});

		return NextResponse.json({
			success: true,
			data: results.map((stock) => ({
				symbol: stock.symbol,
				name: stock.name,
				exchangeShortName: stock.exchangeShortName || null,
				exchange: stock.exchange || null,
				type: stock.type || null,
			})),
		});

	} catch (error) {
		console.error('Error fetching data:', error);
		return NextResponse.json({
			success: false,
			message: 'Failed to fetch stock data.',
		}, { status: 500 });
	}
}
