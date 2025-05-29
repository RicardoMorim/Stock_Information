
import connectToDatabase from "@/app/utils/db";
import Stock from "@/app/models/Stock";

/**
 * Fetches asset details from the database
 * @param {string} symbol - The stock symbol to lookup
 * @returns {Promise<object|null>} - Asset details from database or null
 */
export async function fetchAssetFromDatabase(symbol) {
  console.log(`[AssetService] Looking up ${symbol} in database`);
  
  try {
    await connectToDatabase();
    
    // Try exact match first
    let asset = await Stock.findOne({ symbol: symbol.toUpperCase() });
    
    if (!asset && symbol.includes(".")) {
      // Try without dot for symbols like BRK.A -> BRKA
      const symbolWithoutDot = symbol.replace(".", "").toUpperCase();
      console.log(`[AssetService] Trying ${symbolWithoutDot} (without dot)`);
      asset = await Stock.findOne({ symbol: symbolWithoutDot });
    }
    
    if (asset) {
      console.log(`[AssetService] Found asset in database:`, {
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        exchange: asset.exchange
      });
      
      return {
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        exchange: asset.exchange,
        currency: asset.currency,
        country: asset.country,
        sector: asset.sector,
        industry: asset.industry,
        description: asset.description,
        website: asset.website,
        logo: asset.logo,
        source: 'Database'
      };
    } else {
      console.log(`[AssetService] Asset ${symbol} not found in database`);
      return null;
    }
  } catch (error) {
    console.error(`[AssetService] Database error for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Creates a minimal asset object for assets not found in database
 * @param {string} symbol - The stock symbol
 * @param {object} snapshotData - Data from API providers
 * @returns {object} - Minimal asset object
 */
export function createMinimalAsset(symbol, snapshotData = {}) {
  console.log(`[AssetService] Creating minimal asset for ${symbol}`);
  
  return {
    symbol: symbol.toUpperCase(),
    name: snapshotData.name || symbol.toUpperCase(),
    type: snapshotData.type || (symbol.includes('/') || symbol.includes('-') ? 'Crypto' : 'Stock'),
    exchange: snapshotData.exchange || 'Unknown',
    currency: 'USD', // Default assumption
    country: 'US', // Default assumption
    sector: null,
    industry: null,
    description: null,
    website: null,
    logo: null,
    source: 'Generated'
  };
}

/**
 * Gets asset details with fallback to minimal asset creation
 * @param {string} symbol - The stock symbol
 * @param {object} snapshotData - Data from API providers for fallback
 * @returns {Promise<object>} - Asset details
 */
export async function getAssetDetails(symbol, snapshotData = {}) {
  console.log(`[AssetService] Getting asset details for ${symbol}`);
  
  try {
    // Try database first
    const dbAsset = await fetchAssetFromDatabase(symbol);
    
    if (dbAsset) {
      return dbAsset;
    }
    
    // Fallback to minimal asset
    const minimalAsset = createMinimalAsset(symbol, snapshotData);
    
    console.log(`[AssetService] Using minimal asset for ${symbol}:`, {
      name: minimalAsset.name,
      type: minimalAsset.type,
      exchange: minimalAsset.exchange
    });
    
    return minimalAsset;
  } catch (error) {
    console.error(`[AssetService] Error getting asset details for ${symbol}:`, error.message);
    
    // Return minimal asset even on error
    return createMinimalAsset(symbol, snapshotData);
  }
}
