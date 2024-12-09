"use client";

export default function Footer() {
  return (
    <footer className="bg-navyBlue p-4 mt-auto shadow-lg">
      <div className="container mx-auto text-center text-white">
        © {new Date().getFullYear()} Stock Investor. All rights reserved.
      </div>
    </footer>
  );
}