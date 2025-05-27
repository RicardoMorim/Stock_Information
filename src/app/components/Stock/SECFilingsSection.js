
"use client";
import { useState, useEffect } from 'react';

const SECFilingsSection = ({ filings, onFilingClick }) => {
    if (!filings || filings.length === 0) {
        return null; // Or a message indicating no filings
    }

    return (
        <section className="mt-8 p-4 md:p-6 bg-gray-800 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Recent SEC Filings</h2>
            <div className="space-y-4">
                {filings.map((filing, index) => (
                    <div key={filing.accessionNo || index} className="p-4 bg-gray-700 rounded-md shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="mb-2 sm:mb-0">
                            <p className="text-lg font-semibold text-white">
                                {filing.form || filing.type} 
                                <span className="text-sm text-gray-400 ml-2">({filing.accessionNo})</span>
                            </p>
                            <p className="text-sm text-gray-400">
                                Filed: {new Date(filing.filingDate).toLocaleDateString()} - Accepted: {new Date(filing.acceptedDate).toLocaleDateString()}
                            </p>
                            {filing.reportDate && <p className="text-xs text-gray-500">Report Date: {new Date(filing.reportDate).toLocaleDateString()}</p>}
                        </div>
                        <button
                            onClick={() => onFilingClick(filing.linkToHtml || filing.finalLink)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm whitespace-nowrap self-start sm:self-center"
                        >
                            View Filing
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SECFilingsSection;
