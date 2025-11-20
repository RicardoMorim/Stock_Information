/**
 * Fear & Greed Index Service
 * Fetches market sentiment data from CNN Fear & Greed Index
 */

/**
 * Fetch Fear & Greed Index data
 * @returns {Promise<object|null>} Fear & Greed data or null if unavailable
 */
export async function fetchFearGreedIndex() {
  try {
    // CNN Fear & Greed Index API
    const response = await fetch('https://fear-and-greed-index.p.rapidapi.com/v1/fgi', {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'fear-and-greed-index.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      console.error('[FearGreedService] API request failed:', response.status);
      
      // Fallback: Return mock data if API fails (for development)
      return "no data available";
    }

    const data = await response.json();
    console.log('[FearGreedService] Fetched Fear & Greed Index data:', data);
    if (data && data.fgi) {
      return {
        value: data.fgi.now.value,
        valueText: data.fgi.now.valueText,
        timestamp: data.fgi.now.timestamp,
        previousClose: data.fgi.previousClose?.value,
        oneWeekAgo: data.fgi.oneWeekAgo?.value,
        oneMonthAgo: data.fgi.oneMonthAgo?.value,
        oneYearAgo: data.fgi.oneYearAgo?.value,
      };
    }

    return "no data available";
  } catch (error) {
    console.error('[FearGreedService] Error fetching Fear & Greed Index:', error.message);
    return "no data available";
  }
}

/**
 * Alternative API source for Fear & Greed Index
 * @returns {Promise<object|null>}
 */
export async function fetchFearGreedIndexAlternative() {
  try {
    // Alternative source: Directly scrape or use alternative API
    const response = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata');
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data && data.fear_and_greed) {
      return {
        value: data.fear_and_greed.score,
        valueText: data.fear_and_greed.rating,
        timestamp: data.fear_and_greed.timestamp,
        previousClose: data.fear_and_greed_historical?.previous_close,
        oneWeekAgo: data.fear_and_greed_historical?.previous_1_week,
        oneMonthAgo: data.fear_and_greed_historical?.previous_1_month,
        oneYearAgo: data.fear_and_greed_historical?.previous_1_year,
      };
    }

    return null;
  } catch (error) {
    console.error('[FearGreedService] Alternative API error:', error.message);
    return null;
  }
}

/**
 * Get Fear & Greed Index with multiple fallbacks
 * @returns {Promise<object>}
 */
export async function getFearGreedIndex() {
  // Try primary source first
  let data = await fetchFearGreedIndex();
  
  if (!data) {
    // Try alternative source
    data = await fetchFearGreedIndexAlternative();
  }
  
  if (!data) {
    // Return mock data as final fallback
    data = getMockFearGreedData();
  }
  
  return data;
}

/**
 * Mock data for development/fallback
 * @returns {object}
 */
function getMockFearGreedData() {
  const value = Math.floor(Math.random() * 100);
  return {
    value,
    valueText: getValueText(value),
    timestamp: new Date().toISOString(),
    previousClose: Math.floor(Math.random() * 100),
    oneWeekAgo: Math.floor(Math.random() * 100),
    oneMonthAgo: Math.floor(Math.random() * 100),
    oneYearAgo: Math.floor(Math.random() * 100),
    isMock: true,
  };
}

/**
 * Convert numeric value to text description
 * @param {number} value - Fear & Greed score (0-100)
 * @returns {string}
 */
function getValueText(value) {
  if (value >= 0 && value <= 25) return 'Extreme Fear';
  if (value > 25 && value <= 45) return 'Fear';
  if (value > 45 && value <= 55) return 'Neutral';
  if (value > 55 && value <= 75) return 'Greed';
  if (value > 75 && value <= 100) return 'Extreme Greed';
  return 'Unknown';
}

/**
 * Get interpretation of Fear & Greed value
 * @param {number} value - Fear & Greed score
 * @returns {string}
 */
export function interpretFearGreed(value) {
  if (value >= 0 && value <= 25) {
    return 'Extreme Fear - Market may be oversold, potential buying opportunity';
  }
  if (value > 25 && value <= 45) {
    return 'Fear - Cautious market sentiment, investors are nervous';
  }
  if (value > 45 && value <= 55) {
    return 'Neutral - Balanced market sentiment';
  }
  if (value > 55 && value <= 75) {
    return 'Greed - Optimistic market, watch for overvaluation';
  }
  if (value > 75 && value <= 100) {
    return 'Extreme Greed - Market may be overbought, potential correction risk';
  }
  return 'Unknown sentiment';
}

export default {
  getFearGreedIndex,
  fetchFearGreedIndex,
  fetchFearGreedIndexAlternative,
  interpretFearGreed,
};
