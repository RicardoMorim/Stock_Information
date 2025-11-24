import connectDB from '@/app/utils/db';
import Portfolio from '@/app/models/Portfolio';
import { fetchSnapshotWithFallback } from './stockDataService';

/**
 * Get user's portfolio with processed data
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} - Processed portfolio data
 */
export async function getUserPortfolio(userId) {
  try {
    await connectDB();
    
    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio || !portfolio.holdings) {
      return null;
    }

    // Process holdings to clean structure
    const processedHoldings = portfolio.holdings.map(holding => ({
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      totalShares: holding.totalShares,
      avgCostPerShareInEUR: holding.avgCostPerShareInEUR,
      currentTotalValueInEUR: holding.currentTotalValueInEUR,
      totalInvestmentInEUR: holding.totalInvestmentInEUR,
      totalProfitLossInEUR: holding.totalProfitLossInEUR,
      percentageReturn: holding.percentageReturn,
      tradingCurrency: holding.tradingCurrency,
      purchaseDate: holding.transactions?.[0]?.purchaseDate,
      sector: holding.sector || 'Unknown'
    }));

    return {
      userId: portfolio.userId,
      holdings: processedHoldings,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt
    };
  } catch (error) {
    console.error('[PortfolioService] Error fetching portfolio:', error);
    throw error;
  }
}

