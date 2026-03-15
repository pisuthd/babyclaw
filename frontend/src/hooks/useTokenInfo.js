import { useReadContract } from 'wagmi';
import { TOKEN_CONFIGS, CHAIN } from '../contracts/config.js';

// ERC20 ABI (subset)
const ERC20_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * Get token info from local config (for known tokens)
 */
export function getTokenInfoFromConfig(symbol) {
  const config = TOKEN_CONFIGS[symbol];
  if (!config) return undefined;

  return {
    address: config.address,
    symbol: config.symbol,
    name: config.name,
    decimals: config.decimals,
  };
}

/**
 * Fetch token info from contract (standalone function)
 * This can be used outside of React components
 */
export async function fetchTokenInfo(
  tokenAddress,
  publicClient
) {
  try {
    // Skip if this is the native token address
    if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase()) {
      return {
        address: tokenAddress,
        symbol: 'CELO',
        name: 'CELO',
        decimals: 18,
      };
    }

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name',
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      }),
    ]);

    return {
      address: tokenAddress,
      symbol: symbol,
      name: name,
      decimals: decimals,
      totalSupply: totalSupply,
    };
  } catch (error) {
    console.error(`Error fetching token info for ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Hook to get token information
 */
export function useTokenInfo(tokenAddress, tokenSymbol) {
  // First try to get from config if symbol is provided
  const configInfo = tokenSymbol ? getTokenInfoFromConfig(tokenSymbol) : undefined;

  // For native CELO, return static info
  const isNative = tokenAddress?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase();
  
  if (isNative) {
    return {
      data: {
        address: tokenAddress,
        symbol: 'CELO',
        name: 'CELO',
        decimals: 18,
      },
      isLoading: false,
    };
  }

  // If we have config info, use it directly
  if (configInfo) {
    return {
      data: configInfo,
      isLoading: false,
    };
  }

  // Otherwise fetch from contract
  const { data: name, isLoading: nameLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'name',
    chainId: CHAIN.id,
    query: {
      enabled: !!tokenAddress,
      staleTime: 300_000, // Cache for 5 minutes
    },
  });

  const { data: symbol, isLoading: symbolLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    chainId: CHAIN.id,
    query: {
      enabled: !!tokenAddress,
      staleTime: 300_000,
    },
  });

  const { data: decimals, isLoading: decimalsLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: CHAIN.id,
    query: {
      enabled: !!tokenAddress,
      staleTime: 300_000,
    },
  });

  const { data: totalSupply, isLoading: totalSupplyLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
    chainId: CHAIN.id,
    query: {
      enabled: !!tokenAddress,
      staleTime: 300_000,
    },
  });

  const isLoading = nameLoading || symbolLoading || decimalsLoading || totalSupplyLoading;

  const data = name && symbol && decimals !== undefined
    ? {
        address: tokenAddress,
        symbol: symbol,
        name: name,
        decimals: decimals,
        totalSupply: totalSupply,
      }
    : undefined;

  return {
    data,
    isLoading,
  };
}

/**
 * Get all token info from config
 */
export function getAllTokenInfo() {
  return Object.values(TOKEN_CONFIGS).map(config => ({
    address: config.address,
    symbol: config.symbol,
    name: config.name,
    decimals: config.decimals,
  }));
}

/**
 * Hook to get all token info
 */
export function useAllTokenInfo() {
  return {
    data: getAllTokenInfo(),
    isLoading: false,
  };
}