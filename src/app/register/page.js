"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Redirect to /stocks if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/stocks");
    }
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("../api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Registration successful!");
        localStorage.setItem("token", data.token); // Store the token
        router.push("/stocks"); // Redirect after successful registration
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
          <h1 className="text-2xl font-bold text-center mb-6">Register</h1>
          <form
            onSubmit={handleRegister}
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
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full mb-4 p-2 border border-lightGray rounded text-black"
            />
            <button
              type="submit"
              className="w-full py-2 bg-orange text-white rounded hover:bg-orange-600"
            >
              Register
            </button>
          </form>
          {message && (
            <p
              className={`text-center mt-4 ${
                message.includes("successful")
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {message}
            </p>
          )}
          <p className="text-center mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
