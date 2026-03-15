/**
 * useMarketsStore Hook
 * Convenient hooks for accessing markets data from the store
 * Auto-fetches on first use and auto-refreshes every 60 seconds
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useMarketsStore, type MarketData, type MarketsState } from '../store/markets.js';
import { getAllCTokenAddresses } from '../contracts/config.js';

// Re-export types for convenience
export type { MarketData, MarketsState };

// Global initialization flag to prevent duplicate initialization
let isInitialized = false;
let autoRefreshInterval: NodeJS.Timeout | null = null;

/**
 * Main hook to access all markets data from the store
 * Automatically fetches markets on first use and starts auto-refresh
 * 
 * @example
 * const { marketsData, markets, isLoading, error, lastFetch } = useMarkets();
 * const celoMarket = marketsData['0x2591...'];
 */
export function useMarkets(): MarketsState {
  // Fetch markets on first use (globally)
  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true;
      const state = useMarketsStore.getState();
      if (!state.hasFetched && !state.isLoading) {
        const marketAddresses = getAllCTokenAddresses();
        state.fetchMarketsDataFromAddresses(marketAddresses);
      }
    }
  }, []);
  
  // Start auto-refresh on mount (globally)
  useEffect(() => {
    if (!autoRefreshInterval) {
      autoRefreshInterval = setInterval(() => {
        const state = useMarketsStore.getState();
        if (state.markets.length > 0) {
          const marketAddresses = state.markets.map(m => m.address) as `0x${string}`[];
          state.fetchMarketsDataFromAddresses(marketAddresses);
        }
      }, 60_000);
    }
    
    return () => {
      // Don't clear interval - let it run for all instances
    };
  }, []);
  
  // Return full state
  return useMarketsStore();
}

/**
 * Get all markets data as an array
 * 
 * @example
 * const markets = useMarketsArray();
 * markets.forEach(market => {
 *   console.log(market.symbol, market.rates.supplyApy);
 * });
 */
export function useMarketsArray(): MarketData[] {
  const marketsData = useMarketsStore(state => state.marketsData);
  return useMemo(() => Object.values(marketsData), [marketsData]);
}

/**
 * Get market data by address
 * 
 * @param address - The cToken contract address
 * @returns MarketData or undefined if not found
 * 
 * @example
 * const market = useMarketByAddress('0x2591d179a0B1dB1c804210E111035a3a13c95a48');
 * console.log(market?.rates.supplyApy);
 */
export function useMarketByAddress(address: string): MarketData | undefined {
  return useMarketsStore(state => 
    state.marketsData[address.toLowerCase()] || state.marketsData[address]
  );
}

/**
 * Get market data by symbol
 * 
 * @param symbol - Token symbol (e.g., 'CELO', 'BABY', 'USDT')
 * @returns MarketData or undefined if not found
 * 
 * @example
 * const celoMarket = useMarketBySymbol('CELO');
 * console.log(celoMarket?.rates.supplyApy);
 */
export function useMarketBySymbol(symbol: string): MarketData | undefined {
  return useMarketsStore(state => 
    Object.values(state.marketsData).find(m => m.symbol.toLowerCase() === symbol.toLowerCase())
  );
}

/**
 * Get markets list (without rates and stats)
 * 
 * @example
 * const markets = useMarketsList();
 * markets.forEach(market => {
 *   console.log(market.symbol, market.address);
 * });
 */
export function useMarketsList() {
  return useMarketsStore(state => state.markets);
}

/**
 * Check if markets are loading
 */
export function useMarketsLoading(): boolean {
  return useMarketsStore(state => state.isLoading);
}

/**
 * Get markets error message
 */
export function useMarketsError(): string | null {
  return useMarketsStore(state => state.error);
}

/**
 * Check if markets have been fetched at least once
 */
export function useMarketsFetched(): boolean {
  return useMarketsStore(state => state.hasFetched);
}

/**
 * Get last fetch timestamp
 */
export function useMarketsLastFetch(): number {
  return useMarketsStore(state => state.lastFetch);
}

/**
 * Manually refresh markets
 */
export function useRefreshMarkets(): () => Promise<void> {
  return useMarketsStore(state => async () => {
    const marketAddresses = state.markets.map(m => m.address) as `0x${string}`[];
    await state.fetchMarketsDataFromAddresses(marketAddresses);
  });
}

/**
 * Refresh a single market by address
 */
export function useRefreshMarket(): (address: `0x${string}`) => Promise<void> {
  return useMarketsStore(state => state.fetchSingleMarketData);
}