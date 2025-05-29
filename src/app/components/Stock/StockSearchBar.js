import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function StockSearchBar({ onSearch, initialQuery = "" }) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  const handleInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(searchTerm.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 md:mb-8 w-full max-w-xl mx-auto"
    >
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Search by symbol or name..."
          className="w-full px-4 py-3 text-base md:text-lg text-white bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow duration-150 ease-in-out shadow-sm hover:shadow-md"
        />
        <button
          type="submit"
          aria-label="Search stocks"
          className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-gray-400 hover:text-blue-500 transition-colors duration-150 ease-in-out"
        >
          <MagnifyingGlassIcon className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>
    </form>
  );
}
