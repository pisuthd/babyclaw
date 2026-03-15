import { useReadContract } from 'wagmi';
import { COMPTROLLER_ADDRESS } from '../contracts/config.js';
import comptrollerAbi from '../contracts/abis/comptroller.json' with { type: 'json' };

/**
 * Hook to interact with the Comptroller contract
 * Fetches all markets from the Comptroller
 * CELO chain only
 */
export function useComptrollerContract() {
  // Fetch all markets from Comptroller
  const { data: markets, isLoading, error, refetch } = useReadContract({
    address: COMPTROLLER_ADDRESS,
    abi: comptrollerAbi,
    functionName: 'getAllMarkets',
    chainId: 42220, // CELO
    query: {
      staleTime: 60_000, // Cache for 1 minute
      retry: 3,
    },
  });

  return {
    markets: markets as `0x${string}`[] | undefined,
    isLoading,
    error,
    refetch,
    comptrollerAddress: COMPTROLLER_ADDRESS,
  };
}

/**
 * Hook to get markets in which a user has positions
 */
export function useUserMarkets(userAddress?: `0x${string}`) {
  const { data: userMarkets, isLoading, error } = useReadContract({
    address: COMPTROLLER_ADDRESS,
    abi: comptrollerAbi,
    functionName: 'getAssetsIn',
    args: userAddress ? [userAddress] : undefined,
    chainId: 42220, // CELO
    query: {
      enabled: !!userAddress,
      staleTime: 30_000, // Cache for 30 seconds
    },
  });

  return {
    userMarkets: userMarkets as `0x${string}`[] | undefined,
    isLoading,
    error,
  };
}

/**
 * Hook to check if a market is listed and get its collateral factor
 */
export function useMarketInfo(marketAddress?: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    address: COMPTROLLER_ADDRESS,
    abi: comptrollerAbi,
    functionName: 'markets',
    args: marketAddress ? [marketAddress] : undefined,
    chainId: 42220, // CELO
    query: {
      enabled: !!marketAddress,
      staleTime: 300_000, // Cache for 5 minutes
    },
  });

  const [isListed, collateralFactor] = (data as [boolean, bigint]) || [false, 0n];

  return {
    isListed,
    collateralFactor,
    collateralFactorPercent: collateralFactor
      ? (Number(collateralFactor) / 1e18 * 100).toFixed(2)
      : '0',
    isLoading,
    error,
  };
}

/**
 * Hook to get user account liquidity
 */
export function useAccountLiquidity(userAddress?: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    address: COMPTROLLER_ADDRESS,
    abi: comptrollerAbi,
    functionName: 'getAccountLiquidity',
    args: userAddress ? [userAddress] : undefined,
    chainId: 42220, // CELO
    query: {
      enabled: !!userAddress,
      staleTime: 30_000, // Cache for 30 seconds
    },
  });

  const [errorCode, liquidity, shortfall] = (data as [bigint, bigint, bigint]) || [0n, 0n, 0n];

  return {
    errorCode,
    liquidity,
    shortfall,
    hasLiquidity: liquidity > 0n,
    hasShortfall: shortfall > 0n,
    isLoading,
    error,
  };
}