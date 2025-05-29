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

		const token = localStorage.getItem("token");
		if (token) {
			router.push("/stocks");
		}
	}, [router]);

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
				localStorage.setItem("token", data.token); 
				router.push("/stocks");
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
			<div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
				<div className="w-full max-w-md bg-gray-800 shadow-2xl rounded-lg p-8 space-y-6">
					<h1 className="text-3xl font-bold text-center text-white mb-6">
						Create your Account
					</h1>
					<form onSubmit={handleRegister} className="space-y-6">
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
						<div>
							<label
								htmlFor="confirmPassword"
								className="text-sm font-medium text-gray-300 block mb-2"
							>
								Confirm Password
							</label>
							<input
								id="confirmPassword"
								type="password"
								placeholder="••••••••"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<button
							type="submit"
							className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold text-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
						>
							Register
						</button>
					</form>
					{message && (
						<p
							className={`text-center mt-4 ${message.includes("successful")
									? "text-green-400"
									: "text-red-400"
								}`}
						>
							{message}
						</p>
					)}
					<p className="text-center text-sm text-gray-400 mt-6">
						Already have an account?{" "}
						<Link
							href="/login"
							className="text-blue-400 hover:underline font-medium"
						>
							Login here
						</Link>
					</p>
				</div>
			</div>
			<Footer />
		</>
	);
}
