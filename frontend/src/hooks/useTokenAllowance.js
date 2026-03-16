import { useReadContract } from 'wagmi';
import { CHAIN } from '../contracts/config.js';
import erc20Abi from '../contracts/abis/erc20.json';

/**
 * Hook to check token allowance for a specific spender
 * Used to check if user has approved the cToken contract to spend their tokens
 */
export function useTokenAllowance(tokenAddress, ownerAddress, spenderAddress) {
  const { data, isLoading, error } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    chainId: CHAIN.id,
    query: {
      enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
      staleTime: 30_000, // Cache for 30 seconds
      retry: 3,
    },
  });

  return {
    allowance: data || 0n,
    isLoading,
    error,
  };
}