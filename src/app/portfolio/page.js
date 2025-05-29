"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import PortfolioSkeleton from "@/app/components/Portfolio/PortfolioSkeleton";
import PortfolioHeader from "@/app/components/Portfolio/PortfolioHeader";
import AddStockForm from "@/app/components/Portfolio/AddStockForm";
import PortfolioTable from "@/app/components/Portfolio/PortfolioTable";
import { useAuth } from "@/app/contexts/AuthContext";

export default function PortfolioPage() {
  console.log("[PortfolioPage] Component rendering or re-rendering.");

  const [portfolio, setPortfolio] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSelling, setIsSelling] = useState(null);
  const router = useRouter();
  const { user } = useAuth();

  const fetchPortfolio = useCallback(async () => {
    console.log("[PortfolioPage] fetchPortfolio called.");

    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch("/api/portfolio", { headers });
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch portfolio");
      }
      const data = await response.json();
      console.log("[PortfolioPage] API response data in fetchPortfolio:", data);
      if (data.success) {
        setPortfolio(data);
      } else {
        throw new Error(
          data.message || "Could not retrieve portfolio data from API"
        );
      }
    } catch (err) {
      console.error("[PortfolioPage] Error fetching portfolio:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      console.log(
        "[PortfolioPage] fetchPortfolio finished, isLoading set to false."
      );
    }
  }, [router]);

  useEffect(() => {
    if (!user) {
      console.error(
        "[PortfolioPage] User not authenticated, redirecting to login."
      );
      router.push("/login");
      return;
    }
    console.log(
      "[PortfolioPage] useEffect for initial fetchPortfolio triggered."
    );
    setIsLoading(true);
    fetchPortfolio();
  }, [fetchPortfolio, router, user]);

  const handleAddStock = async (stockData) => {
    setIsAdding(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(stockData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to add stock");
      }
      if (data.success) {
        await fetchPortfolio();
      } else {
        throw new Error(data.message || "Could not add stock to portfolio");
      }
    } catch (err) {
      console.error("Error adding stock:", err);
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSellStock = async (symbol, quantity) => {
    setIsSelling(symbol);
    setError(null);
    try {
      const token = localStorage.getItem("token");

      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/portfolio/${encodeURIComponent(symbol)}`,
        {
          method: "DELETE",
          headers: headers, // Pass headers
          body: JSON.stringify({ quantity }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to sell stock");
      }
      if (data.success) {
        // refetch portfolio to reflect changes
        await fetchPortfolio();
      } else {
        throw new Error(data.message || "Could not sell stock");
      }
    } catch (err) {
      console.error("Error selling stock:", err);
      setError(err.message);
    } finally {
      setIsSelling(null);
    }
  };

  const portfolioSummary = useMemo(() => {
    if (!portfolio?.summary) {
      console.log(
        "[PortfolioPage] portfolioSummary: portfolio or portfolio.summary is undefined, returning defaults."
      ); // Page Log 6
      return {
        totalInvestmentInEUR: 0,
        currentTotalValueInEUR: 0,
        totalProfitLossInEUR: 0,
        overallPercentageReturn: 0,
      };
    }
    console.log(
      "[PortfolioPage] portfolioSummary: calculating with portfolio.summary:",
      portfolio.summary
    ); // Page Log 7
    return {
      totalInvestmentInEUR: portfolio.summary.totalInvestmentInEUR || 0,
      currentTotalValueInEUR: portfolio.summary.currentTotalValueInEUR || 0,
      totalProfitLossInEUR: portfolio.summary.totalProfitLossInEUR || 0,
      overallPercentageReturn: portfolio.summary.percentageReturn || 0,
    };
  }, [portfolio]);

  console.log(
    "[PortfolioPage] Current portfolio state before render:",
    portfolio
  );
  console.log(
    "[PortfolioPage] Data passed to PortfolioTable (portfolio?.data):",
    portfolio?.data
  ); // Page Log 9
  console.log(
    "[PortfolioPage] Summary passed to PortfolioHeader (portfolioSummary):",
    portfolioSummary
  ); // Page Log 10

  if (isLoading && !portfolio?.data) {
    console.log(
      "[PortfolioPage] Rendering PortfolioSkeleton (isLoading true and no portfolio data)."
    ); // Page Log 11
    return <PortfolioSkeleton />;
  }

  if (error && !portfolio?.data) {
    console.log(
      "[PortfolioPage] Rendering error display (error present and no portfolio data)."
    ); // Page Log 12
    return (
      <div className="container mx-auto p-6 bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
        <p className="text-2xl text-red-500 mb-4">Error: {error}</p>
        <button
          onClick={() => {
            setIsLoading(true);
            fetchPortfolio();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors mb-4"
        >
          Retry
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
        >
          Go to Homepage
        </button>
      </div>
    );
  }
  console.log("[PortfolioPage] Proceeding to render main portfolio view.");

  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-900 text-white min-h-screen">
      <PortfolioHeader
        totalValue={portfolioSummary.currentTotalValueInEUR}
        totalInvestment={portfolioSummary.totalInvestmentInEUR}
        totalProfitLoss={portfolioSummary.totalProfitLossInEUR}
        overallPercentageReturn={portfolioSummary.overallPercentageReturn}
      />

      {/* Display general errors (e.g., from add/sell) above the form */}
      {error && portfolio && (
        <div
          className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md relative mb-6"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <AddStockForm onAddStock={handleAddStock} isAdding={isAdding} />

      {isLoading && portfolio?.data && (
        <div className="text-center py-4">
          <p className="text-lg text-blue-400">Refreshing portfolio data...</p>
        </div>
      )}

      <PortfolioTable
        portfolio={portfolio?.data || []}
        onSell={handleSellStock}
        isSelling={isSelling}
      />
    </div>
  );
}
