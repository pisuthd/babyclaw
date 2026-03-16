import { useMemo } from 'react';
import { useUserMarkets } from './useComptrollerContract';
import { CTOKEN_ADDRESSES } from '../contracts/config.js';

/**
 * Hook to check if a user has entered a specific market (enabled as collateral)
 * Returns whether the market is in the user's list of entered markets
 */
export function useMarketEntry(symbol, userAddress) {
  const marketAddress = CTOKEN_ADDRESSES[symbol];
  
  const { userMarkets, isLoading, error } = useUserMarkets(userAddress);

  const isEntered = useMemo(() => {
    if (!marketAddress || !userMarkets) return false;
    // Check if the market address is in the user's entered markets array
    return userMarkets.includes(marketAddress);
  }, [userMarkets, marketAddress]);

  return {
    isEntered,
    isLoading,
    error,
  };
}