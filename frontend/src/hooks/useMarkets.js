import { TOKEN_CONFIGS, CTOKEN_ADDRESSES, CHAIN } from '../contracts/config.js';

/**
 * Market interface
 * @typedef {Object} Market
 * @property {string} address
 * @property {string} symbol
 * @property {string} name
 * @property {number} decimals
 * @property {string} underlyingAddress
 * @property {boolean} isNative
 */

/**
 * Get all available markets
 */
export function getAllMarkets() {
  return Object.entries(CTOKEN_ADDRESSES).map(([symbol, address]) => {
    const config = TOKEN_CONFIGS[symbol];
    return {
      address,
      symbol,
      name: config?.name || symbol,
      decimals: config?.decimals || 18,
      underlyingAddress: config?.address || '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      isNative: symbol === 'CELO',
    };
  });
}

/**
 * Get market by address
 */
export function getMarketByAddress(address) {
  return getAllMarkets().find(m => m.address.toLowerCase() === address.toLowerCase());
}

/**
 * Get market by symbol
 */
export function getMarketBySymbol(symbol) {
  return getAllMarkets().find(m => m.symbol.toLowerCase() === symbol.toLowerCase());
}

/**
 * Get cToken address by underlying token symbol
 */
export function getCTokenAddress(symbol) {
  return CTOKEN_ADDRESSES[symbol];
}

/**
 * Check if an address is a valid market
 */
export function isValidMarket(address) {
  return Object.values(CTOKEN_ADDRESSES).some(
    addr => addr.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get all market symbols
 */
export function getMarketSymbols() {
  return Object.keys(CTOKEN_ADDRESSES);
}

/**
 * Get all market addresses
 */
export function getMarketAddresses() {
  return Object.values(CTOKEN_ADDRESSES);
}

/**
 * Hook to get all markets (for consistency with other hooks)
 */
export function useMarkets() {
  return {
    markets: getAllMarkets(),
    marketAddresses: getMarketAddresses(),
    marketSymbols: getMarketSymbols(),
  };
}
