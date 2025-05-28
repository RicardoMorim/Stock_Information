"use client";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Import new components
import StocksPageSkeleton from '@/app/components/Stock/StocksPageSkeleton';
import StockSearchBar from '@/app/components/Stock/StockSearchBar';
import StockCard from '@/app/components/Stock/StockCard';
import Pagination from '@/app/components/Stock/Pagination';

const ITEMS_PER_PAGE = 12; // Number of stocks to display per page

export default function StocksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mainStocksData, setMainStocksData] = useState([]); // For initially displayed cards with full data
  const [searchableList, setSearchableList] = useState([]); // For search functionality (symbol, name)
  const [filteredSearchableList, setFilteredSearchableList] = useState([]); // For paginated display of search results

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const initialQuery = searchParams.get('query') || '';
  const initialPage = parseInt(searchParams.get('page'), 10) || 1;

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Fetch initial data (main stocks with details + full searchable list)
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // This single endpoint will provide both main stocks data and the full searchable list
        const response = await fetch('/api/stocks'); 
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch initial stock data');
        }
        const data = await response.json();
        if (data.success && data.data) {
          setMainStocksData(data.data.mainStocksData || []);
          const sl = data.data.searchableList || [];
          setSearchableList(sl);
          // Log a sample of the searchable list to help debug missing symbols
          if (sl.length > 0) {
            console.log("Sample of searchableList symbols:", sl.slice(0, 10).map(s => s.symbol));
          }
        } else {
          throw new Error(data.message || 'Could not retrieve initial stock data');
        }
      } catch (err) {
        console.error("Error fetching initial stock data:", err);
        setError(err.message);
        setMainStocksData([]);
        setSearchableList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Update URL when searchTerm or currentPage changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set('query', searchTerm);
    }
    // Only add page to URL if searching (not for initial main stocks display)
    if (searchTerm && currentPage > 1) {
      params.set('page', currentPage.toString());
    }
    // Use router.push to ensure re-render if only query params change, replace might not always trigger it.
    router.push(`/stocks?${params.toString()}`, { scroll: false });
  }, [searchTerm, currentPage, router]);

  // Memoized filtering for search results
  const searchResultsPaginated = useMemo(() => {
    if (!searchTerm) {
      setFilteredSearchableList([]); // Clear if no search term
      return [];
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = searchableList.filter(stock =>
      (stock.symbol?.toLowerCase().includes(lowercasedFilter)) ||
      (stock.name?.toLowerCase().includes(lowercasedFilter))
    );

    // Sort the filtered results for relevance
    const sortedFiltered = filtered.sort((a, b) => {
      const aSymbol = a.symbol?.toLowerCase() || '';
      const bSymbol = b.symbol?.toLowerCase() || '';
      const aName = a.name?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';

      // Priority 1: Exact symbol match
      if (aSymbol === lowercasedFilter && bSymbol !== lowercasedFilter) return -1;
      if (bSymbol === lowercasedFilter && aSymbol !== lowercasedFilter) return 1;
      if (aSymbol === lowercasedFilter && bSymbol === lowercasedFilter) { // Both exact symbol match, sort by symbol
        return aSymbol.localeCompare(bSymbol);
      }

      // Priority 2: Symbol starts with search term
      const aSymbolStartsWith = aSymbol.startsWith(lowercasedFilter);
      const bSymbolStartsWith = bSymbol.startsWith(lowercasedFilter);
      if (aSymbolStartsWith && !bSymbolStartsWith) return -1;
      if (bSymbolStartsWith && !aSymbolStartsWith) return 1;
      if (aSymbolStartsWith && bSymbolStartsWith) { // Both symbols start with, sort by symbol
        return aSymbol.localeCompare(bSymbol);
      }

      // Priority 3: Name starts with search term
      const aNameStartsWith = aName.startsWith(lowercasedFilter);
      const bNameStartsWith = bName.startsWith(lowercasedFilter);
      if (aNameStartsWith && !bNameStartsWith) return -1;
      if (bNameStartsWith && !aNameStartsWith) return 1;
      if (aNameStartsWith && bNameStartsWith) { // Both names start with, sort by name then symbol
        const nameComparison = aName.localeCompare(bName);
        if (nameComparison !== 0) return nameComparison;
        return aSymbol.localeCompare(bSymbol);
      }
      
      // Priority 4: Symbol includes search term (but doesn't start with)
      const aSymbolIncludes = aSymbol.includes(lowercasedFilter);
      const bSymbolIncludes = bSymbol.includes(lowercasedFilter);
      if (aSymbolIncludes && !bSymbolIncludes) return -1;
      if (bSymbolIncludes && !aSymbolIncludes) return 1;

      // Priority 5: Name includes search term (but doesn't start with)
      // This is the fallback if none of the above apply, already covered by initial filter.
      // Final fallback: alphabetical by symbol, then by name for stability
      const symbolComparison = aSymbol.localeCompare(bSymbol);
      if (symbolComparison !== 0) return symbolComparison;
      return aName.localeCompare(bName);
    });
    
    setFilteredSearchableList(sortedFiltered); // Update for totalPages calculation using the sorted list

    const firstPageIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const lastPageIndex = firstPageIndex + ITEMS_PER_PAGE;
    return sortedFiltered.slice(firstPageIndex, lastPageIndex);
  }, [searchableList, searchTerm, currentPage]);

  const handleSearch = useCallback((query) => {
    setSearchTerm(query);
    setCurrentPage(1); // Reset to first page on new search
  }, []);

  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (isLoading) {
    return <StocksPageSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
        <p className="text-2xl text-red-500 mb-4">Error: {error}</p>
        <p className="text-gray-400 mb-6">Could not load stock data. Please try again later.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  // Determine what to display: initial main stocks or search results
  const displayData = searchTerm ? searchResultsPaginated : mainStocksData;
  const totalPages = searchTerm ? Math.ceil(filteredSearchableList.length / ITEMS_PER_PAGE) : 0; // Pagination only for search

  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-900 text-white min-h-screen">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-400">Explore Stocks</h1>
        <p className="text-lg md:text-xl text-gray-400 mt-2">Find your next investment opportunity.</p>
      </header>

      <StockSearchBar onSearch={handleSearch} initialQuery={searchTerm} />

      {displayData.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {displayData.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          {searchTerm ? (
            <p className="text-xl text-gray-500">No stocks found matching your criteria: &quot;{searchTerm}&quot;.</p>
          ) : (
            <p className="text-xl text-gray-500">No featured stocks available at the moment.</p> // Message if mainStocksData is empty and no search
          )}
        </div>
      )}

      {/* Show pagination only when there is a search term and multiple pages */}
      {searchTerm && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
