export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Determine the range of page numbers to display
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    endPage = Math.min(totalPages, 5);
  }
  if (currentPage > totalPages - 3) {
    startPage = Math.max(1, totalPages - 4);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav aria-label="Page navigation" className="flex justify-center items-center space-x-2 mt-8 md:mt-12">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      {startPage > 1 && (
        <button
          onClick={() => onPageChange(1)}
          className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
        >
          1
        </button>
      )}
      {startPage > 2 && <span className="text-gray-500">...</span>}

      {pageNumbers.map((number) => (
        <button
          key={number}
          onClick={() => onPageChange(number)}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === number
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 bg-gray-700 hover:bg-gray-600'
            }`}
        >
          {number}
        </button>
      ))}

      {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
      {endPage < totalPages && (
        <button
          onClick={() => onPageChange(totalPages)}
          className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
        >
          {totalPages}
        </button>
      )}

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </nav>
  );
}
