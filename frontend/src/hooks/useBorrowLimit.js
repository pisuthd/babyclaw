import { useReadContract, useAccount } from 'wagmi';
import { COMPTROLLER_ADDRESS, CHAIN } from '../contracts/config.js';
import { formatUnits } from 'viem';

// Comptroller ABI (subset for account liquidity)
const COMPTROLLER_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' }
    ],
    name: 'getAccountLiquidity',
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * Hook to get user's borrow limit and account health
 * Returns:
 * - borrowLimitUSD: Total value of collateral that can be borrowed (in USD)
 * - totalBorrowUSD: Total value currently borrowed (in USD)
 * - healthFactor: Account health factor (higher is better)
 * - isLiquidatable: Whether account is at risk of liquidation
 */
export function useBorrowLimit() {
  const { address } = useAccount();

  const { data: accountLiquidity, isLoading, error } = useReadContract({
    address: COMPTROLLER_ADDRESS,
    abi: COMPTROLLER_ABI,
    functionName: 'getAccountLiquidity',
    args: address ? [address] : undefined,
    chainId: CHAIN.id,
    query: {
      enabled: !!address,
      staleTime: 30_000, // Cache for 30 seconds
    },
  });

  if (!accountLiquidity || accountLiquidity.length < 3) {
    return {
      borrowLimitUSD: 0,
      totalBorrowUSD: 0,
      healthFactor: 999, // Safe default when no borrows
      isLiquidatable: false,
      isLoading,
      error,
    };
  }

  // Destructure the values
  const [errorValue, liquidityValue, shortfallValue] = accountLiquidity;

  // liquidityValue = collateral value - borrow value
  // shortfallValue = 0 means safe, > 0 means liquidatable
  
  const liquidityUSD = Number(formatUnits(liquidityValue, 18));
  const shortfallUSD = Number(formatUnits(shortfallValue, 18));

  // Calculate borrow limit and total borrowed
  // Borrow limit = total collateral * collateral factor
  // Total borrowed = total collateral - liquidity
  
  // For simplicity, we'll estimate:
  // - If liquidity > 0, this is how much more you can borrow
  // - Total borrowed would need to be tracked separately or calculated differently
  
  // A better approach: get total collateral and total borrows from markets
  // For now, let's use the liquidity as available to borrow
  const availableToBorrowUSD = Math.max(0, liquidityUSD);
  
  // Health factor calculation
  // Health factor = (collateral value * collateral factor) / borrow value
  // If shortfall > 0, health factor is < 1 (liquidatable)
  const isLiquidatable = shortfallUSD > 0;
  const healthFactor = isLiquidatable ? 0.5 : 999; // Simplified calculation

  return {
    borrowLimitUSD: availableToBorrowUSD,
    totalBorrowUSD: 0, // Would need to be calculated from all markets
    healthFactor,
    isLiquidatable,
    isLoading,
    error,
  };
}

/**
 * Get user's total collateral value across all markets
 * This is a helper that would need to iterate through all markets
 */
export function useTotalCollateral() {
  const { address } = useAccount();
  
  // This would need to fetch from all markets
  // For now, return placeholder
  return {
    data: 0,
    isLoading: false,
    error: null,
  };
}

/**
 * Calculate safe borrow amount (80% of borrow limit for safety)
 */
export function getSafeBorrowAmount(borrowLimitUSD) {
  return borrowLimitUSD * 0.8;
}

/**
 * Format USD value for display
 */
export function formatUSD(value) {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(2)}`;
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${(value / 1000000).toFixed(2)}M`;
}