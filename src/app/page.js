"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

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
      <Navbar />
      <div className="container mx-auto flex-grow flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to My App</h1>
          <p className="text-lg mb-6">Join us and explore amazing features!</p>
          <a
            href="/login"
            className="px-5 py-2 bg-orange text-white rounded hover:bg-orange-600"
          >
            Login
          </a>
        </div>
      </div>
      <Footer />
    </>
  );
}
