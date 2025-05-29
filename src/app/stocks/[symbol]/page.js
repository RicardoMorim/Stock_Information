"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import StockDetailsSkeleton from "@/app/components/Stock/StockDetailsSkeleton";
import StockHeader from "@/app/components/Stock/StockHeader";
import PriceChart from "@/app/components/Stock/PriceChart";
import KeyMetrics from "@/app/components/Stock/KeyMetrics";
import NewsSection from "@/app/components/Stock/NewsSection";
import SECFilingsSection from "@/app/components/Stock/SECFilingsSection";
import FilingViewModal from "@/app/components/Stock/FilingViewModal";
import { useAuth } from "@/app/contexts/AuthContext";

const getCachedData = (symbol, type) => {
  try {
    const data = localStorage.getItem(`stock_${symbol}_${type}`);
    if (!data) return null;
    const { value, timestamp } = JSON.parse(data);
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      localStorage.removeItem(`stock_${symbol}_${type}`);
      return null;
    }
    return value;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
};

const setCachedData = (symbol, type, data) => {
  try {
    localStorage.setItem(
      `stock_${symbol}_${type}`,
      JSON.stringify({
        value: data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Cache write error:", error);
  }
};

export default function StockDetails() {
  const params = useParams();
  const symbol = params?.symbol;
  const router = useRouter();

  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFiling, setShowFiling] = useState(false);
  const [filingDetails, setFilingDetails] = useState(null);
  const [filingIsLoading, setFilingIsLoading] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      console.error("User not authenticated, redirecting to login.");
      router.push("/login");
      return;
    }

    if (!symbol) {
      setError("Symbol not provided.");
      setIsLoading(false);
      return;
    }

    const fetchStockDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Check cache first
        const cachedStockData = getCachedData(symbol, "details");
        if (cachedStockData) {
          console.log(`Using cached data for ${symbol}`);
          setStockData(cachedStockData);
          setIsLoading(false);
          return;
        }

        console.log(`Fetching fresh data for ${symbol}`);
        const response = await fetch(
          `/api/stocks/stock/${encodeURIComponent(symbol)}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Failed to fetch stock data for ${symbol}`
          );
        }
        const apiResponse = await response.json();

        if (
          apiResponse.success &&
          apiResponse.data &&
          typeof apiResponse.data === "object" &&
          apiResponse.data.data
        ) {
          console.log(
            "StockDetails page: Extracted stock properties from apiResponse.data.data:",
            JSON.stringify(apiResponse.data.data, null, 2)
          );

          // Cache the data
          setCachedData(symbol, "details", apiResponse.data.data);

          setStockData(apiResponse.data.data);
        } else if (
          apiResponse.success &&
          apiResponse.data &&
          !apiResponse.data.data
        ) {
          console.error(
            "API success true, outer data object (apiResponse.data) present, but inner data payload (apiResponse.data.data) is missing:",
            apiResponse.data
          );
          throw new Error(
            "Received success from API but the crucial inner data payload is missing."
          );
        } else if (apiResponse.success && !apiResponse.data) {
          console.error(
            "API success true, but outer data object (apiResponse.data) is missing:",
            apiResponse
          );
          throw new Error("Received success from API but no data payload.");
        } else {
          throw new Error(
            apiResponse.message || `Could not retrieve data for ${symbol}`
          );
        }
      } catch (err) {
        console.error("Error fetching stock details:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockDetails();
  }, [symbol, router]);

  const fetchFilingDetails = async (url) => {
    if (!url) return;
    setFilingIsLoading(true);
    setShowFiling(true);
    setFilingDetails(null);

    try {
      // Check cache for filing details
      const cachedFilingData = getCachedData(url, "filing");
      if (cachedFilingData) {
        console.log(`Using cached filing data for ${url}`);
        setFilingDetails(cachedFilingData);
        setFilingIsLoading(false);
        return;
      }

      console.log(`Fetching fresh filing data for ${url}`);
      const response = await fetch(
        `/api/stocks/filings/${encodeURIComponent(url)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch filing details");
      }
      const data = await response.json();
      if (data.success) {
        // Cache the filing data
        setCachedData(url, "filing", data.data);
        setFilingDetails(data.data);
      } else {
        throw new Error(data.message || "Could not retrieve filing details");
      }
    } catch (err) {
      console.error("Error fetching filing details:", err);
    } finally {
      setFilingIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowFiling(false);
    setFilingDetails(null);
  };

  if (isLoading) {
    return <StockDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
        <p className="text-2xl text-red-500 mb-4">Error: {error}</p>
        <button
          onClick={() => router.push("/stocks")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          Back to Stocks
        </button>
      </div>
    );
  }

  console.log(
    `StockDetails page rendering. isLoading: ${isLoading}, error: ${error}`
  );
  if (stockData) {
    console.log(
      "StockDetails page stockData state before render (first 500 chars):",
      JSON.stringify(stockData, null, 2).substring(0, 500)
    );
  } else {
    console.log(
      "StockDetails page stockData state is null or undefined before render."
    );
  }

  if (!stockData) {
    return (
      <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
        <p className="text-2xl text-gray-400 mb-4">
          Stock data not found for {symbol}.
        </p>
        <button
          onClick={() => router.push("/stocks")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          Back to Stocks
        </button>
      </div>
    );
  }

  const {
    name,
    exchangeShortName,
    type,
    price,
    changePercent,
    historicalData,
    news,
    high,
    low,
    volume,
    vwap,
    fundamentals,
    secFilings,
    source,
    isDelayed,
  } = stockData;

  const keyMetricsData = { high, low, volume, vwap, fundamentals };

  console.log("Stock historicalData:", historicalData);

  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-900 text-white min-h-screen">
      <StockHeader
        symbol={symbol}
        name={name}
        exchange={exchangeShortName}
        price={price}
        changePercent={changePercent}
        type={type}
        source={source}
        isDelayed={isDelayed}
      />

      <PriceChart historicalData={historicalData} symbol={symbol} />

      <KeyMetrics metrics={keyMetricsData} />

      {Array.isArray(news) && news.length > 0 && (
        <NewsSection news={news} symbol={symbol} />
      )}

      {secFilings && secFilings.length > 0 && (
        <SECFilingsSection
          secFilings={secFilings}
          onViewFiling={fetchFilingDetails}
        />
      )}

      <FilingViewModal
        showFiling={showFiling}
        onClose={handleCloseModal}
        filingDetails={filingDetails}
        isLoading={filingIsLoading}
      />
    </div>
  );
}
