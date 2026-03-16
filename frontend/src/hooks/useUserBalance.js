import { useReadContract, useAccount, useBalance } from 'wagmi';
import { TOKEN_CONFIGS, CHAIN } from '../contracts/config.js';

// ERC20 ABI (subset)
const ERC20_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * Hook to get user's token balance
 * Works for both ERC20 tokens and native CELO
 */
export function useUserBalance(tokenSymbol) {
  const { address } = useAccount();
 
  const tokenConfig = TOKEN_CONFIGS[tokenSymbol];
 
  // For native CELO, use getBalance
  if (tokenSymbol === 'CELO') {
    const { data: balance, isLoading, error } = useBalance({
      address: address,
      chainId: CHAIN.id,
    });

    return {
      data: balance?.value,
      isLoading,
      error,
    };
  }

  // For ERC20 tokens, use balanceOf
  const { data: balance, isLoading, error } = useReadContract({
    address: tokenConfig?.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN.id,
    query: {
      enabled: !!address && !!tokenConfig?.address,
      staleTime: 30_000, // Cache for 30 seconds
    },
  });
 

  return {
    data: balance,
    isLoading,
    error,
  };
}

/**
 * Format balance for display
 */
export function formatBalance(balance, decimals) {
  if (!balance) return '0';
  
  const balanceNumber = Number(balance) / Math.pow(10, decimals || 18);
  
  if (balanceNumber === 0) return '0';
  if (balanceNumber < 0.000001) return balanceNumber.toFixed(8);
  if (balanceNumber < 0.001) return balanceNumber.toFixed(6);
  if (balanceNumber < 1) return balanceNumber.toFixed(4);
  if (balanceNumber < 1000) return balanceNumber.toFixed(2);
  if (balanceNumber < 1000000) return balanceNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return balanceNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}