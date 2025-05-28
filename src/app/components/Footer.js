"use client";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white p-6 mt-auto shadow-md">
      <div className="container mx-auto text-center">
        <p className="text-sm">&copy; {new Date().getFullYear()} Stock Investor. All rights reserved.</p>
        <p className="text-xs mt-1">Built with Next.js and Tailwind CSS</p>
      </div>
    </footer>
  );
}