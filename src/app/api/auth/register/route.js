import { NextResponse } from "next/server";
import connectToDatabase from "@/app/utils/db";
import User from "@/app/models/UserModel";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export async function POST(request) {
  try {
    await connectToDatabase();
    const { email, password } = await request.json();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const user = new User({ email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
