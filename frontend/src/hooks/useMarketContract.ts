import { useReadContract } from 'wagmi';
import { TOKEN_CONFIGS, CTOKEN_ADDRESSES, CHAIN } from '../contracts/config.js';
import cTokenAbi from '../contracts/abis/cToken.json' with { type: 'json' };
import { type Address } from 'viem';

/**
 * Types for market data
 */
export interface MarketBasicInfo {
  underlying: Address;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
}

export interface MarketRates {
  supplyRatePerBlock: bigint;
  borrowRatePerBlock: bigint;
  exchangeRateStored: bigint;
}

export interface MarketStats {
  cash: bigint;
  totalBorrows: bigint;
  totalReserves: bigint;
  totalSupply: bigint;
}

export interface UserMarketData {
  balanceOf: bigint;
  borrowBalanceStored: bigint;
}

/**
 * Hook to get basic market information (underlying, symbol, name, decimals)
 * Handles both ERC-20 tokens and native tokens (CELO)
 */
export function useMarketBasicInfo(marketAddress?: Address, tokenSymbol?: string) {
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
          ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address // Zero address for native
          : (underlying as Address),
        symbol: symbol as string,
        name: name as string,
        decimals: decimals as number,
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
export function useMarketRates(marketAddress?: Address) {
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
        supplyRatePerBlock: supplyRatePerBlock as bigint,
        borrowRatePerBlock: borrowRatePerBlock as bigint,
        exchangeRateStored: exchangeRateStored as bigint,
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
export function useMarketStats(marketAddress?: Address) {
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
        cash: cash as bigint,
        totalBorrows: totalBorrows as bigint,
        totalReserves: totalReserves as bigint,
        totalSupply: totalSupply as bigint,
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
export function useUserMarketData(marketAddress?: Address, userAddress?: Address) {
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
        balanceOf: balanceOf as bigint,
        borrowBalanceStored: borrowBalanceStored as bigint,
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
export function getMarketAddressByToken(symbol: string): Address | undefined {
  return CTOKEN_ADDRESSES[symbol as keyof typeof CTOKEN_ADDRESSES];
}

/**
 * Get all market addresses
 */
export function getAllMarketAddresses(): Address[] {
  return Object.values(CTOKEN_ADDRESSES);
}

/**
 * Get all market symbols
 */
export function getAllMarketSymbols(): string[] {
  return Object.keys(CTOKEN_ADDRESSES);
}