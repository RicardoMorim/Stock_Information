
"use client";

const StockDetailsSkeleton = () => (
    <div className="animate-pulse container mx-auto p-4 md:p-6 bg-gray-900 text-white">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 p-4 bg-gray-800 rounded-lg shadow-lg">
            <div>
                <div className="h-8 bg-gray-700 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-600 rounded w-24"></div>
            </div>
            <div className="mt-4 md:mt-0">
                <div className="h-10 bg-gray-700 rounded w-32"></div>
            </div>
        </div>

        {/* Chart Skeleton */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg shadow-lg">
            <div className="h-64 md:h-96 bg-gray-700 rounded"></div> {/* Adjusted height for responsiveness */}
        </div>

        {/* Key Metrics Skeleton */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg shadow-lg">
            <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-3 bg-gray-700 rounded">
                        <div className="h-4 bg-gray-600 rounded w-3/4 mb-1"></div>
                        <div className="h-5 bg-gray-500 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        </div>

        {/* News Section Skeleton */}
        <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
            <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
            {[...Array(3)].map((_, i) => (
                <div key={i} className="mb-4 pb-4 border-b border-gray-700 last:border-b-0">
                    <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
                        <div className="w-full sm:w-24 h-32 sm:h-16 bg-gray-700 rounded"></div>
                        <div className="flex-1">
                            <div className="h-5 bg-gray-600 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-500 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-500 rounded w-full mb-1"></div>
                            <div className="h-3 bg-gray-500 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default StockDetailsSkeleton;
