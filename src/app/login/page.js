"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const { user, loading, login } = useAuth(); 

  useEffect(() => {
    if (user && !loading) {
      console.log("User is already logged in, redirecting to stocks page.");
      router.push("/stocks");
    }
  }, [user, loading, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("../api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Login successful!");
        login(data, data.token);
        router.push("/stocks"); 
      } else {
        setMessage(data.error || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Something went wrong during login.");
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 shadow-2xl rounded-lg p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center text-white mb-6">
            Login to Stock Investor
          </h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-300 block mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-300 block mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold text-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Login
            </button>
          </form>
          {message && (
            <p
              className={`text-center ${
                message.includes("successful")
                  ? "text-green-400"
                  : "text-red-400"
              } mt-4`}
            >
              {message}
            </p>
          )}
          <p className="text-center text-sm text-gray-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-blue-400 hover:underline font-medium"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
