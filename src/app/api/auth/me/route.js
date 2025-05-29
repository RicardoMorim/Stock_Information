import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/app/utils/db'; 
import User from '@/app/models/UserModel'; 

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authentication token is missing or malformed' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Authentication token is missing' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(decoded.id).select('-password'); 

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
        id: user._id, 
        username: user.username, 
        email: user.email 
    });

  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}