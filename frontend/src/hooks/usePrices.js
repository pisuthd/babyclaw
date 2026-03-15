/**
 * usePrices Hook
 * Convenient hooks for accessing prices from the store
 */

import { useEffect } from 'react';
import { usePricesStore } from '../store/priceStore.js';

/**
 * Main hook to access all prices from the store
 * Automatically fetches prices on first use
 * 
 * @example
 * const { prices, priceData, isLoading, error, fetchPrices } = usePrices();
 * const kubPrice = prices['KUB']; // 0.9435...
 * const kubData = priceData['KUB']; // Full data with 24h change
 */
export function usePrices() {
  const store = usePricesStore();
  
  // Fetch prices on first use (only once)
  useEffect(() => {
    if (!store.hasFetched && !store.isLoading) {
      store.fetchPrices();
    }
  }, [store.hasFetched, store.isLoading, store.fetchPrices]);
  
  return {
    ...store,
    initializePrices: store.fetchPrices,
  };
}

/**
 * Get a single price by symbol
 * 
 * @param symbol - Token symbol (e.g., 'KUB', 'USD₮', 'stKAIA')
 * @returns Price value or undefined if not found
 * 
 * @example
 * const kubPrice = usePrice('KUB'); // 0.9435...
 * const usdtPrice = usePrice('USD₮'); // 1.00007...
 */
export function usePrice(symbol) {
  return usePricesStore((state) => state.prices[symbol]);
}

/**
 * Get full price data for a symbol
 * 
 * @param symbol - Token symbol (e.g., 'KUB', 'USD₮', 'stKAIA')
 * @returns Complete PriceData object or undefined if not found
 * 
 * @example
 * const kubData = usePriceData('KUB');
 * console.log(kubData.percent_change_24h); // 24h percentage change
 */
export function usePriceData(symbol) {
  return usePricesStore((state) => state.priceData[symbol]);
}

/**
 * Check if prices are loading
 */
export function usePricesLoading() {
  return usePricesStore((state) => state.isLoading);
}

/**
 * Get price error message
 */
export function usePricesError() {
  return usePricesStore((state) => state.error);
}

/**
 * Manually refresh prices
 */
export function useRefreshPrices() {
  return usePricesStore((state) => state.fetchPrices);
}
