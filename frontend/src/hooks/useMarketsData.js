import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import cTokenAbi from '../contracts/abis/cToken.json';
import { CHAIN } from '../contracts/config.js';

/**
 * Complete market data including rates and statistics
 * @typedef {Object} MarketData
 * @property {Object} rates
 * @property {bigint} rates.supplyRatePerBlock
 * @property {bigint} rates.borrowRatePerBlock
 * @property {bigint} rates.exchangeRateStored
 * @property {number} rates.supplyApy
 * @property {number} rates.borrowApy
 * @property {Object} stats
 * @property {bigint} stats.cash
 * @property {bigint} stats.totalBorrows
 * @property {bigint} stats.totalReserves
 * @property {bigint} stats.totalSupply
 * @property {bigint} stats.availableLiquidity
 * @property {number} stats.utilizationRate
 * @property {string} address
 * @property {string} symbol
 * @property {string} name
 * @property {number} decimals
 * @property {string} underlyingAddress
 * @property {boolean} isNative
 */

// CELO blocks per year (1 second block time = 31,536,000 blocks per year)
const BLOCKS_PER_YEAR = 31536000n;

/**
 * Convert block rate to APY
 * CELO: 1 second per block = 31,536,000 blocks per year
 */
function blockRateToApy(ratePerBlock) {
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
  market,
  publicClient
) {
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

    const supplyApy = blockRateToApy(supplyRate);
    const borrowApy = blockRateToApy(borrowRate);
    const availableLiquidity = cash;
    const utilizationRate =
      totalBorrows > 0n
        ? Number(totalBorrows) /
          Number(totalBorrows + cash)
        : 0;

    // Calculate total supply in underlying tokens
    const totalSupplyUnderlying =
      (BigInt((totalSupply || 0).toString()) * BigInt(exchangeRate.toString())) /
      BigInt(10 ** 18);

    return {
      ...market,
      rates: {
        supplyRatePerBlock: supplyRate,
        borrowRatePerBlock: borrowRate,
        exchangeRateStored: exchangeRate,
        supplyApy,
        borrowApy,
      },
      stats: {
        cash,
        totalBorrows,
        totalReserves: 0n, // Not fetched in this version
        totalSupply: totalSupplyUnderlying,
        availableLiquidity,
        utilizationRate,
      },
    };
  } catch (error) {
    console.error(`Error fetching market data for ${market.symbol}:`, error);
    return null;
  }
}

/**
 * Hook to get complete market data for a single market
 */
export function useMarketData(market) {
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

    const supplyApy = blockRateToApy(supplyRate);
    const borrowApy = blockRateToApy(borrowRate);
    const availableLiquidity = cash;
    const totalBorrowsValue = totalBorrows;
    const utilizationRate = totalBorrowsValue && totalBorrowsValue > 0n
      ? Number(totalBorrowsValue) / Number(totalBorrowsValue + cash)
      : 0;

    // Calculate total supply in underlying tokens
    const totalSupplyUnderlying =
      (BigInt((totalSupply || 0).toString()) * BigInt(exchangeRate.toString())) /
      BigInt(10 ** 18);

    return {
      ...market,
      rates: {
        supplyRatePerBlock: supplyRate,
        borrowRatePerBlock: borrowRate,
        exchangeRateStored: exchangeRate,
        supplyApy,
        borrowApy,
      },
      stats: {
        cash,
        totalBorrows,
        totalReserves: totalReserves,
        totalSupply: totalSupplyUnderlying,
        availableLiquidity,
        utilizationRate,
      },
    };
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
export function formatMarketData(marketData, prices) {
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
