"use client";
import { useState, useEffect } from "react";

export default function FilingViewModal({ show, onClose, filingUrl }) {
  const [filingDetails, setFilingDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && filingUrl) {
      const fetchDetails = async () => {
        setIsLoading(true);
        setError(null);
        setFilingDetails(null);
        try {
          const response = await fetch(
            `/api/stocks/filings/${encodeURIComponent(filingUrl)}`
          );
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Failed to fetch filing details"
            );
          }
          const data = await response.json();
          if (data.success) {
            setFilingDetails(data.data);
          } else {
            throw new Error(
              data.message || "Could not retrieve filing details"
            );
          }
        } catch (err) {
          console.error("Error fetching filing details:", err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    }
  }, [show, filingUrl]);

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">
            SEC Filing Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-white text-lg">Loading filing...</p>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mt-4"></div>
          </div>
        ) : error ? (
          <p className="text-red-500 text-center py-4">Error: {error}</p>
        ) : filingDetails ? (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: filingDetails }}
          />
        ) : (
          <p className="text-gray-400 text-center py-4">
            No filing content to display, or an error occurred.
          </p>
        )}
      </div>
    </div>
  );
}
