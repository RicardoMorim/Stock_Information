import { NextResponse } from 'next/server';
import connectToDatabase from '@/app/utils/db';
import Stock from '@/app/models/Stock';

export async function GET(req) {
	await connectToDatabase();

	try {
		
		const stocks = await Stock.find({});
		return NextResponse.json({
			success: true,
			data: stocks,
		});

	} catch (error) {
		console.error('Error fetching stocks:', error);
		return NextResponse.json({
			success: false,
			message: 'Failed to fetch stocks.',
		}, { status: 500 });
	}
}
