
export default function StocksPageSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-900 text-white min-h-screen">
      <div className="animate-pulse">
        {/* Header Skeleton */}
        <div className="mb-8 text-center">
          <div className="h-8 bg-gray-700 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-6 bg-gray-700 rounded w-1/2 mx-auto"></div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="mb-6">
          <div className="h-10 bg-gray-700 rounded w-full md:w-1/2 mx-auto"></div>
        </div>

        {/* Stock List Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-gray-800 shadow-lg rounded-lg p-4 md:p-6">
              <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="flex justify-between items-center mb-3">
                <div className="h-8 bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/4"></div>
              </div>
              <div className="h-10 bg-blue-700 rounded w-full"></div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="mt-8 flex justify-center">
          <div className="h-10 bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
}

