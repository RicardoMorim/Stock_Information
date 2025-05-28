"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /stocks if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/stocks");
    }
  }, [router]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col justify-center items-center p-4">
        <div className="text-center space-y-8 max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            Welcome to{" "}
            <span className="text-blue-400">Stock Investor</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300">
            Your comprehensive platform for tracking stocks, managing portfolios,
            and staying updated with the latest market insights.
          </p>
          <div className="space-x-4">
            <Link
              href="/login"
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg font-semibold shadow-lg"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-lg font-semibold shadow-lg"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
