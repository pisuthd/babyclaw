import { TOKEN_CONFIGS, CTOKEN_ADDRESSES, CHAIN } from '../contracts/config.js';
import { type Address } from 'viem';

/**
 * Market interface
 */
export interface Market {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  underlyingAddress: Address;
  isNative: boolean;
}

/**
 * Get all available markets
 */
export function getAllMarkets(): Market[] {
  return Object.entries(CTOKEN_ADDRESSES).map(([symbol, address]) => {
    const config = TOKEN_CONFIGS[symbol as keyof typeof TOKEN_CONFIGS];
    return {
      address,
      symbol,
      name: config?.name || symbol,
      decimals: config?.decimals || 18,
      underlyingAddress: config?.address || ('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address),
      isNative: symbol === 'CELO',
    };
  });
}

/**
 * Get market by address
 */
export function getMarketByAddress(address: Address): Market | undefined {
  return getAllMarkets().find(m => m.address.toLowerCase() === address.toLowerCase());
}

/**
 * Get market by symbol
 */
export function getMarketBySymbol(symbol: string): Market | undefined {
  return getAllMarkets().find(m => m.symbol.toLowerCase() === symbol.toLowerCase());
}

/**
 * Get cToken address by underlying token symbol
 */
export function getCTokenAddress(symbol: string): Address | undefined {
  return CTOKEN_ADDRESSES[symbol as keyof typeof CTOKEN_ADDRESSES];
}

/**
 * Check if an address is a valid market
 */
export function isValidMarket(address: Address): boolean {
  return Object.values(CTOKEN_ADDRESSES).some(
    addr => addr.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get all market symbols
 */
export function getMarketSymbols(): string[] {
  return Object.keys(CTOKEN_ADDRESSES);
}

/**
 * Get all market addresses
 */
export function getMarketAddresses(): Address[] {
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