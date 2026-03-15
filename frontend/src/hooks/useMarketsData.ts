import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits, parseUnits, type Address } from 'viem';
import cTokenAbi from '../contracts/abis/cToken.json' with { type: 'json' };
import type { Market } from './useMarkets.js';
import { CHAIN } from '../contracts/config.js';

/**
 * Complete market data including rates and statistics
 */
export interface MarketData extends Market {
  rates: {
    supplyRatePerBlock: bigint;
    borrowRatePerBlock: bigint;
    exchangeRateStored: bigint;
    supplyApy: number;
    borrowApy: number;
  };
  stats: {
    cash: bigint;
    totalBorrows: bigint;
    totalReserves: bigint;
    totalSupply: bigint;
    availableLiquidity: bigint;
    utilizationRate: number;
  };
}

// CELO blocks per year (1 second block time = 31,536,000 blocks per year)
const BLOCKS_PER_YEAR = 31536000n;

/**
 * Convert block rate to APY
 * CELO: 1 second per block = 31,536,000 blocks per year
 */
function blockRateToApy(ratePerBlock: bigint): number {
  if (ratePerBlock === 0n) return 0;

  const ratePerYear = ratePerBlock * BLOCKS_PER_YEAR;
  const apy = (Number(ratePerYear) / 1e18) * 100;
  return apy;
}

/**
 * Fetch market data for a single market (standalone function)
 * This can be used outside of React components (e.g., in Zustand store)
 */
export async function fetchMarketData(
  market: Market,
  publicClient: any
): Promise<MarketData | null> {
  try {
    const [supplyRate, borrowRate, exchangeRate, cash, totalBorrows, totalSupply] =
      await Promise.all([
        publicClient.readContract({
          address: market.address,
          abi: cTokenAbi,
          functionName: 'supplyRatePerBlock',
        }),
        publicClient.readContract({
          address: market.address,
          abi: cTokenAbi,
          functionName: 'borrowRatePerBlock',
        }),
        publicClient.readContract({
          address: market.address,
          abi: cTokenAbi,
          functionName: 'exchangeRateStored',
        }),
        publicClient.readContract({
          address: market.address,
          abi: cTokenAbi,
          functionName: 'getCash',
        }),
        publicClient.readContract({
          address: market.address,
          abi: cTokenAbi,
          functionName: 'totalBorrows',
        }),
        publicClient.readContract({
          address: market.address,
          abi: cTokenAbi,
          functionName: 'totalSupply',
        }),
      ]);

    const supplyApy = blockRateToApy(supplyRate as bigint);
    const borrowApy = blockRateToApy(borrowRate as bigint);
    const availableLiquidity = cash as bigint;
    const utilizationRate =
      (totalBorrows as bigint) > 0n
        ? Number(totalBorrows as bigint) /
          Number((totalBorrows as bigint) + (cash as bigint))
        : 0;

    // Calculate total supply in underlying tokens
    const totalSupplyUnderlying =
      (BigInt((totalSupply || 0).toString()) * BigInt(exchangeRate.toString())) /
      BigInt(10 ** 18);

    return {
      ...market,
      rates: {
        supplyRatePerBlock: supplyRate as bigint,
        borrowRatePerBlock: borrowRate as bigint,
        exchangeRateStored: exchangeRate as bigint,
        supplyApy,
        borrowApy,
      },
      stats: {
        cash: cash as bigint,
        totalBorrows: totalBorrows as bigint,
        totalReserves: 0n, // Not fetched in this version
        totalSupply: totalSupplyUnderlying as bigint,
        availableLiquidity,
        utilizationRate,
      },
    } as MarketData;
  } catch (error) {
    console.error(`Error fetching market data for ${market.symbol}:`, error);
    return null;
  }
}

/**
 * Hook to get complete market data for a single market
 */
export function useMarketData(market: Market | undefined) {
  const { data: supplyRate, isLoading: supplyRateLoading } = useReadContract({
    address: market?.address,
    abi: cTokenAbi,
    functionName: 'supplyRatePerBlock',
    chainId: CHAIN.id,
    query: {
      enabled: !!market,
      staleTime: 60_000, // 1 minute
    },
  });

  const { data: borrowRate, isLoading: borrowRateLoading } = useReadContract({
    address: market?.address,
    abi: cTokenAbi,
    functionName: 'borrowRatePerBlock',
    chainId: CHAIN.id,
    query: {
      enabled: !!market,
      staleTime: 60_000, // 1 minute
    },
  });

  const { data: exchangeRate, isLoading: exchangeRateLoading } = useReadContract({
    address: market?.address,
    abi: cTokenAbi,
    functionName: 'exchangeRateStored',
    chainId: CHAIN.id,
    query: {
      enabled: !!market,
      staleTime: 60_000, // 1 minute
    },
  });

  const { data: cash, isLoading: cashLoading } = useReadContract({
    address: market?.address,
    abi: cTokenAbi,
    functionName: 'getCash',
    chainId: CHAIN.id,
    query: {
      enabled: !!market,
      staleTime: 30_000, // 30 seconds
    },
  });

  const { data: totalBorrows, isLoading: totalBorrowsLoading } = useReadContract({
    address: market?.address,
    abi: cTokenAbi,
    functionName: 'totalBorrows',
    chainId: CHAIN.id,
    query: {
      enabled: !!market,
      staleTime: 30_000, // 30 seconds
    },
  });

  const { data: totalSupply, isLoading: totalSupplyLoading } = useReadContract({
    address: market?.address,
    abi: cTokenAbi,
    functionName: 'totalSupply',
    chainId: CHAIN.id,
    query: {
      enabled: !!market,
      staleTime: 30_000, // 30 seconds
    },
  });

  const { data: totalReserves, isLoading: totalReservesLoading } = useReadContract({
    address: market?.address,
    abi: cTokenAbi,
    functionName: 'totalReserves',
    chainId: CHAIN.id,
    query: {
      enabled: !!market,
      staleTime: 30_000, // 30 seconds
    },
  });

  const marketData = useMemo(() => {
    if (!market || !borrowRate || !exchangeRate) {
      return undefined;
    }

    const supplyApy = blockRateToApy(supplyRate as bigint);
    const borrowApy = blockRateToApy(borrowRate as bigint);
    const availableLiquidity = (cash as bigint) as bigint;
    const totalBorrowsValue = totalBorrows as bigint | undefined;
    const utilizationRate = totalBorrowsValue && totalBorrowsValue > 0n
      ? Number(totalBorrowsValue) / Number(totalBorrowsValue + (cash as bigint))
      : 0;

    // Calculate total supply in underlying tokens
    const totalSupplyUnderlying =
      (BigInt((totalSupply || 0).toString()) * BigInt(exchangeRate.toString())) /
      BigInt(10 ** 18);

    return {
      ...market,
      rates: {
        supplyRatePerBlock: supplyRate as bigint,
        borrowRatePerBlock: borrowRate as bigint,
        exchangeRateStored: exchangeRate as bigint,
        supplyApy,
        borrowApy,
      },
      stats: {
        cash: cash as bigint,
        totalBorrows: totalBorrows as bigint,
        totalReserves: totalReserves as bigint,
        totalSupply: totalSupplyUnderlying as bigint,
        availableLiquidity,
        utilizationRate,
      },
    } as MarketData;
  }, [market, supplyRate, borrowRate, exchangeRate, cash, totalBorrows, totalSupply, totalReserves]);

  const isLoading = supplyRateLoading || borrowRateLoading || exchangeRateLoading ||
    cashLoading || totalBorrowsLoading || totalSupplyLoading || totalReservesLoading;

  return {
    data: marketData,
    isLoading,
  };
}

/**
 * Format market data for display
 */
export function formatMarketData(marketData: MarketData, prices: Record<string, number>) {
  const tokenPrice = prices[marketData.symbol] || 0;
  
  return {
    ...marketData,
    stats: {
      ...marketData.stats,
      totalSupplyFormatted: formatUnits(marketData.stats.totalSupply, marketData.decimals),
      totalBorrowsFormatted: formatUnits(marketData.stats.totalBorrows, marketData.decimals),
      cashFormatted: formatUnits(marketData.stats.cash, marketData.decimals),
      totalSupplyUSD: Number(formatUnits(marketData.stats.totalSupply, marketData.decimals)) * tokenPrice,
      totalBorrowsUSD: Number(formatUnits(marketData.stats.totalBorrows, marketData.decimals)) * tokenPrice,
      cashUSD: Number(formatUnits(marketData.stats.cash, marketData.decimals)) * tokenPrice,
    },
    rates: {
      ...marketData.rates,
      supplyApyFormatted: marketData.rates.supplyApy.toFixed(2),
      borrowApyFormatted: marketData.rates.borrowApy.toFixed(2),
    },
    priceUSD: tokenPrice,
    utilizationRateFormatted: (marketData.stats.utilizationRate * 100).toFixed(2),
  };
}