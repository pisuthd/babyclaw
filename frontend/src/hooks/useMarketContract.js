import { useReadContract } from 'wagmi';
import { TOKEN_CONFIGS, CTOKEN_ADDRESSES, CHAIN } from '../contracts/config.js';
import cTokenAbi from '../contracts/abis/cToken.json';

/**
 * Hook to get basic market information (underlying, symbol, name, decimals)
 * Handles both ERC-20 tokens and native tokens (CELO)
 */
export function useMarketBasicInfo(marketAddress, tokenSymbol) {
  // Try to get underlying address - if it fails, this is a native token market
  const { data: underlying, isLoading: underlyingLoading, error: underlyingError } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'underlying',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 300_000, // Cache for 5 minutes
      retry: false, // Don't retry on failure (native tokens don't have this function)
    },
  });

  const { data: symbol, isLoading: symbolLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'symbol',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 300_000,
    },
  });

  const { data: name, isLoading: nameLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'name',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 300_000,
    },
  });

  const { data: decimals, isLoading: decimalsLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'decimals',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 300_000,
    },
  });

  // Native token markets (cCELO) don't have an underlying() function
  const isNative = !underlying && !underlyingLoading && tokenSymbol === 'CELO';

  const isLoading = underlyingLoading || symbolLoading || nameLoading || decimalsLoading;

  const data = symbol && name && decimals !== undefined
    ? {
        underlying: isNative 
          ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' // Zero address for native
          : underlying,
        symbol: symbol,
        name: name,
        decimals: decimals,
        isNative,
      }
    : undefined;

  return {
    data,
    isLoading,
    error: isNative ? undefined : underlyingError, // Don't report error for native tokens
  };
}

/**
 * Hook to get market rates (supply, borrow, exchange rate)
 */
export function useMarketRates(marketAddress) {
  const { data: supplyRatePerBlock, isLoading: supplyLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'supplyRatePerBlock',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 60_000, // Cache for 1 minute
    },
  });

  const { data: borrowRatePerBlock, isLoading: borrowLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'borrowRatePerBlock',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 60_000,
    },
  });

  const { data: exchangeRateStored, isLoading: exchangeLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'exchangeRateStored',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 60_000,
    },
  });

  const isLoading = supplyLoading || borrowLoading || exchangeLoading;

  const data = supplyRatePerBlock && borrowRatePerBlock && exchangeRateStored
    ? {
        supplyRatePerBlock: supplyRatePerBlock,
        borrowRatePerBlock: borrowRatePerBlock,
        exchangeRateStored: exchangeRateStored,
      }
    : undefined;

  return {
    data,
    isLoading,
  };
}

/**
 * Hook to get market statistics (cash, borrows, reserves, supply)
 */
export function useMarketStats(marketAddress) {
  const { data: cash, isLoading: cashLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'getCash',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 30_000, // Cache for 30 seconds
    },
  });

  const { data: totalBorrows, isLoading: borrowsLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'totalBorrows',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 30_000,
    },
  });

  const { data: totalReserves, isLoading: reservesLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'totalReserves',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 30_000,
    },
  });

  const { data: totalSupply, isLoading: supplyLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'totalSupply',
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress,
      staleTime: 30_000,
    },
  });

  const isLoading = cashLoading || borrowsLoading || reservesLoading || supplyLoading;

  const data = cash !== undefined && totalBorrows !== undefined && totalReserves !== undefined && totalSupply !== undefined
    ? {
        cash: cash,
        totalBorrows: totalBorrows,
        totalReserves: totalReserves,
        totalSupply: totalSupply,
      }
    : undefined;

  return {
    data,
    isLoading,
  };
}

/**
 * Hook to get user's market data (balance, borrow balance)
 */
export function useUserMarketData(marketAddress, userAddress) {
  const { data: balanceOf, isLoading: balanceLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress && !!userAddress,
      staleTime: 30_000,
    },
  });

  const { data: borrowBalanceStored, isLoading: borrowLoading } = useReadContract({
    address: marketAddress,
    abi: cTokenAbi,
    functionName: 'borrowBalanceStored',
    args: userAddress ? [userAddress] : undefined,
    chainId: CHAIN.id,
    query: {
      enabled: !!marketAddress && !!userAddress,
      staleTime: 30_000,
    },
  });

  const isLoading = balanceLoading || borrowLoading;

  const data = balanceOf !== undefined && borrowBalanceStored !== undefined
    ? {
        balanceOf: balanceOf,
        borrowBalanceStored: borrowBalanceStored,
      }
    : undefined;

  return {
    data,
    isLoading,
  };
}

/**
 * Get market address from token symbol
 */
export function getMarketAddressByToken(symbol) {
  return CTOKEN_ADDRESSES[symbol];
}

/**
 * Get all market addresses
 */
export function getAllMarketAddresses() {
  return Object.values(CTOKEN_ADDRESSES);
}

/**
 * Get all market symbols
 */
export function getAllMarketSymbols() {
  return Object.keys(CTOKEN_ADDRESSES);
}