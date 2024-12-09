"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Redirect to /stocks if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/stocks");
    }
  }, []);

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
        localStorage.setItem("token", data.token);
        router.push("/stocks"); // Redirect after successful login
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage("Something went wrong");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto flex-grow flex items-center justify-center">
        <div className="w-full max-w-md p-6 bg-navyBlue text-white rounded shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
          <form
            onSubmit={handleLogin}
            className="bg-white p-6 rounded shadow-md"
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full mb-4 p-2 border border-lightGray rounded text-black"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mb-4 p-2 border border-lightGray rounded text-black"
            />
            <button
              type="submit"
              className="w-full py-2 bg-orange text-white rounded hover:bg-orange-600"
            >
              Login
            </button>
          </form>
          {message && <p className="text-center text-red-500">{message}</p>}
          <p className="text-center mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
