import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
	try {
		const { url } = await params;

		const response = await fetch(url + `?apikey=${process.env.POLYGON_KEY}`);

		if (!response.ok) throw new Error('Failed to fetch filing');

		const data = await response.text();

		return NextResponse.json({ data });
	} catch (error) {
		console.log(error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}