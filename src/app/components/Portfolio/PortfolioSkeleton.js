
export default function PortfolioSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-900 text-white min-h-screen animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-10 bg-gray-700 rounded w-1/2 md:w-1/3 mb-3"></div>
        <div className="h-6 bg-gray-700 rounded w-1/3 md:w-1/4"></div>
      </div>

      {/* Add Stock Form Skeleton */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8 md:mb-10">
        <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-1"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
          <div className="md:col-span-1">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-1"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
          <div className="md:col-span-1">
            <div className="h-10 bg-blue-700 rounded"></div>
          </div>
        </div>
      </div>

      {/* Portfolio Table Skeleton */}
      <div className="overflow-x-auto bg-gray-800 shadow-lg rounded-lg">
        <div className="min-w-full">
          {/* Table Header Skeleton */}
          <div className="text-xs text-gray-400 uppercase bg-gray-750 flex">
            <div className="px-3 py-3 md:px-5 md:py-4 flex-1"><div className="h-4 bg-gray-600 rounded w-3/4"></div></div>
            <div className="px-3 py-3 md:px-5 md:py-4 flex-1 text-right"><div className="h-4 bg-gray-600 rounded w-1/2 ml-auto"></div></div>
            <div className="px-3 py-3 md:px-5 md:py-4 flex-1 text-right"><div className="h-4 bg-gray-600 rounded w-1/2 ml-auto"></div></div>
            <div className="px-3 py-3 md:px-5 md:py-4 flex-1 text-right"><div className="h-4 bg-gray-600 rounded w-1/2 ml-auto"></div></div>
            <div className="px-3 py-3 md:px-5 md:py-4 flex-1 text-right"><div className="h-4 bg-gray-600 rounded w-1/2 ml-auto"></div></div>
            <div className="px-3 py-3 md:px-5 md:py-4 flex-1 text-right"><div className="h-4 bg-gray-600 rounded w-1/2 ml-auto"></div></div>
            <div className="px-3 py-3 md:px-5 md:py-4 flex-1 text-center"><div className="h-4 bg-gray-600 rounded w-1/2 mx-auto"></div></div>
          </div>
          {/* Table Body Skeleton - Repeat for a few rows */}
          {[...Array(3)].map((_, index) => (
            <div key={index} className="border-b border-gray-700 flex">
              <div className="py-4 px-3 md:px-5 flex-1"><div className="h-5 bg-gray-700 rounded w-5/6"></div></div>
              <div className="py-4 px-3 md:px-5 flex-1 text-right"><div className="h-5 bg-gray-700 rounded w-1/3 ml-auto"></div></div>
              <div className="py-4 px-3 md:px-5 flex-1 text-right"><div className="h-5 bg-gray-700 rounded w-1/3 ml-auto"></div></div>
              <div className="py-4 px-3 md:px-5 flex-1 text-right"><div className="h-5 bg-gray-700 rounded w-1/3 ml-auto"></div></div>
              <div className="py-4 px-3 md:px-5 flex-1 text-right"><div className="h-5 bg-gray-700 rounded w-1/3 ml-auto"></div></div>
              <div className="py-4 px-3 md:px-5 flex-1 text-right"><div className="h-5 bg-gray-700 rounded w-1/2 ml-auto"></div></div>
              <div className="py-4 px-3 md:px-5 flex-1 text-center"><div className="h-8 w-8 bg-gray-700 rounded-md mx-auto"></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
