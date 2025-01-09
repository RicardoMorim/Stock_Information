"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <nav className="bg-navyBlue p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <span className="text-white font-bold text-xl">Stock Investor</span>
        </Link>

        <div className="flex items-center space-x-6">
          {isLoggedIn ? (
            <>
              {/* Navigation Links */}
              <Link 
                href="/portfolio" 
                className="text-white hover:text-orange transition-colors"
              >
                Portfolio
              </Link>
              <Link 
                href="/stocks" 
                className="text-white hover:text-orange transition-colors"
              >
                Stocks
              </Link>
              <button
                onClick={handleLogout}
                className="text-orange hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-orange hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/register" className="text-orange hover:text-white transition-colors">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}