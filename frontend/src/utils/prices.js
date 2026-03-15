/**
 * Price API Utilities
 * API endpoints, symbol mapping, and price formatting
 */

// API Configuration
const PRICE_API_URL = 'https://kvxdikvk5b.execute-api.ap-southeast-1.amazonaws.com/prod/prices';

// Symbol mapping from API response to display symbols
export const SYMBOL_MAP = {
  'USDT': 'USD₮',
};

// Reverse mapping for looking up API symbols from display symbols
const REVERSE_SYMBOL_MAP = Object.fromEntries(
  Object.entries(SYMBOL_MAP).map(([apiSymbol, displaySymbol]) => [displaySymbol, apiSymbol])
);

// Tokens that should be formatted with fewer decimals (USD-like tokens)
const USD_LIKE_TOKENS = ['USD', 'USDT', 'USDC', 'DAI', 'USD₮', 'USDC.e'];

/**
 * Check if a token is USD-like (stablecoins)
 */
function isUSDLike(symbol) {
  return USD_LIKE_TOKENS.some(token => symbol.toUpperCase().includes(token));
}

/**
 * Format price for display
 * @param price - The price value
 * @param symbol - The token symbol (optional, for determining decimal places)
 * @returns Formatted price string
 */
export function formatPrice(price, symbol) {
  if (isNaN(price)) return '$0.00';

  // USD-like tokens: 2-4 decimals
  if (symbol && isUSDLike(symbol)) {
    if (Math.abs(price) < 0.01) {
      return `$${price.toFixed(4)}`;
    }
    return `$${price.toFixed(2)}`;
  }

  // Small tokens (< $0.01): 4-6 decimals
  if (Math.abs(price) < 0.01) {
    return `$${price.toFixed(6)}`;
  }

  // Mid-range tokens ($0.01 - $1): 4 decimals
  if (Math.abs(price) < 1) {
    return `$${price.toFixed(4)}`;
  }

  // Larger tokens ($1+): 2 decimals
  return `$${price.toFixed(2)}`;
}

/**
 * Format percentage change
 * @param percentChange - The 24h percentage change
 * @returns Formatted percentage string
 */
export function formatPercentChange(percentChange) {
  const sign = percentChange >= 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(2)}%`;
}

/**
 * Fetch prices from the API
 */
export async function fetchPricesFromAPI() {
  const response = await fetch(PRICE_API_URL);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Process price data from API response
 * Applies symbol mapping and returns a prices object
 */
export function processPriceData(data) {
  const prices = {};
  const priceData = {};

  for (const item of data) {
    // Apply symbol mapping (e.g., USDT -> USD₮)
    const displaySymbol = SYMBOL_MAP[item.symbol] || item.symbol;
    
    prices[displaySymbol] = item.price;
    priceData[displaySymbol] = {
      ...item,
      symbol: displaySymbol, // Use the mapped symbol
    };
  }

  // Add hardcoded BABY price for now
  prices['BABY'] = 0.0000075;
  priceData['BABY'] = {
    symbol: 'BABY',
    price: 0.0000075,
    percent_change_24h: 0,
    market_cap: 0,
    volume_24h: 0,
    last_updated: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  };

  return { prices, priceData };
}

/**
 * Get API symbol from display symbol (reverse lookup)
 * Useful for API calls if needed in the future
 */
export function getApiSymbol(displaySymbol) {
  return REVERSE_SYMBOL_MAP[displaySymbol] || displaySymbol;
}
