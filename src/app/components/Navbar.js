"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext"; 

export default function Navbar() {
  const router = useRouter();
  const { user, logout, loading } = useAuth(); 

  const handleLogout = () => {
    logout(); 
    router.push("/login");
  };

  if (loading) {
    return (
      <nav className="bg-gray-900 p-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <span className="text-white font-bold text-2xl hover:text-blue-400 transition-colors">
              Stock Investor
            </span>
          </Link>
          <div className="text-gray-300">Loading...</div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-900 p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <span className="text-white font-bold text-2xl hover:text-blue-400 transition-colors">
            Stock Investor
          </span>
        </Link>

        <div className="flex items-center space-x-6">
          {user ? ( 
            <>
              <Link
                href="/portfolio"
                className="text-gray-300 hover:text-blue-400 transition-colors px-3 py-2 rounded-md text-sm font-medium"
              >
                Portfolio
              </Link>
              <Link
                href="/stocks"
                className="text-gray-300 hover:text-blue-400 transition-colors px-3 py-2 rounded-md text-sm font-medium"
              >
                Stocks
              </Link>
              {user.username && (
                <span className="text-gray-400 text-sm">Hi, {user.username}!</span>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-300 hover:text-blue-400 transition-colors px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}