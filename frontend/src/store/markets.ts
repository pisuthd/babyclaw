/**
 * Markets Store (Zustand)
 * Global state management for market data on CELO chain
 * Fetches real data from blockchain contracts and auto-refreshes every 60 seconds
 * CELO chain only - no multi-chain support
 */

import { create } from 'zustand';
import type { Market } from '../hooks/useMarkets.js';
import type { MarketData } from '../hooks/useMarketsData.js';
import { NATIVE_TOKEN, TOKEN_CONFIGS, CHAIN } from '../contracts/config.js';
import { PublicClient, createPublicClient, http } from 'viem';

// cToken ABI (subset)
const CTOKEN_ABI = [
  {
    inputs: [],
    name: 'underlying',
    outputs: [{ name: '', type: 'address' }],
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
    name: 'name',
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
    name: 'supplyRatePerBlock',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'borrowRatePerBlock',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'exchangeRateStored',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCash',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalBorrows',
    outputs: [{ name: '', type: 'uint256' }],
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
] as const;

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
] as const;

// Re-export MarketData for convenience
export type { MarketData };

// Public client for contract calls
let publicClient: any;

function getPublicClient(): any {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: CHAIN,
      transport: http(),
    });
  }
  return publicClient;
}

/**
 * Fetch cToken basic info (standalone function for use in store)
 */
async function fetchMarketBasicInfo(marketAddress: `0x${string}`): Promise<{ underlying: `0x${string}`; symbol: string; name: string; decimals: number; isNative: boolean } | null> {
  try {
    const client = getPublicClient();
    
    // Try to get underlying address - if it fails, this is a native token market
    let underlying: `0x${string}` | null = null;
    try {
      underlying = await client.readContract({
        address: marketAddress,
        abi: CTOKEN_ABI,
        functionName: 'underlying',
      }) as `0x${string}`;
    } catch {
      // Native token markets don't have underlying() function
    }

    const [symbol, name, decimals] = await Promise.all([
      client.readContract({
        address: marketAddress,
        abi: CTOKEN_ABI,
        functionName: 'symbol',
      }) as Promise<string>,
      client.readContract({
        address: marketAddress,
        abi: CTOKEN_ABI,
        functionName: 'name',
      }) as Promise<string>,
      client.readContract({
        address: marketAddress,
        abi: CTOKEN_ABI,
        functionName: 'decimals',
      }) as Promise<number>,
    ]);

    const isNative = !underlying;

    return {
      underlying: underlying || '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as `0x${string}`,
      symbol: symbol as string,
      name: name as string,
      decimals: decimals as number,
      isNative,
    };
  } catch (error) {
    console.error(`Error fetching basic info for ${marketAddress}:`, error);
    return null;
  }
}

/**
 * Fetch token info (standalone function for use in store)
 */
async function fetchTokenInfo(tokenAddress: `0x${string}`): Promise<{ symbol: string; name: string; decimals: number } | null> {
  try {
    const client = getPublicClient();
    
    const [symbol, name, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }) as Promise<string>,
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name',
      }) as Promise<string>,
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }) as Promise<number>,
    ]);

    return {
      symbol: symbol as string,
      name: name as string,
      decimals: decimals as number,
    };
  } catch (error) {
    console.error(`Error fetching token info for ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Fetch market data (standalone function for use in store)
 */
async function fetchMarketData(market: Market, client: any): Promise<MarketData | null> {
  try {
    // CELO blocks per year (1 second block time = 31,536,000 blocks per year)
    const BLOCKS_PER_YEAR = 31536000n;

    const [supplyRate, borrowRate, exchangeRate, cash, totalBorrows, totalSupply] =
      await Promise.all([
        client.readContract({
          address: market.address,
          abi: CTOKEN_ABI,
          functionName: 'supplyRatePerBlock',
        }),
        client.readContract({
          address: market.address,
          abi: CTOKEN_ABI,
          functionName: 'borrowRatePerBlock',
        }),
        client.readContract({
          address: market.address,
          abi: CTOKEN_ABI,
          functionName: 'exchangeRateStored',
        }),
        client.readContract({
          address: market.address,
          abi: CTOKEN_ABI,
          functionName: 'getCash',
        }),
        client.readContract({
          address: market.address,
          abi: CTOKEN_ABI,
          functionName: 'totalBorrows',
        }),
        client.readContract({
          address: market.address,
          abi: CTOKEN_ABI,
          functionName: 'totalSupply',
        }),
      ]);

    // Convert block rate to APY
    const blockRateToApy = (ratePerBlock: bigint): number => {
      if (ratePerBlock === 0n) return 0;
      const ratePerYear = ratePerBlock * BLOCKS_PER_YEAR;
      const apy = (Number(ratePerYear) / 1e18) * 100;
      return apy;
    };

    const supplyApy = blockRateToApy(supplyRate as bigint);
    const borrowApy = blockRateToApy(borrowRate as bigint);
    const availableLiquidity = cash as bigint;
    const utilizationRate: number =
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
        totalReserves: 0n,
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

export interface MarketsState {
  // Markets data: marketAddress -> MarketData
  marketsData: Record<string, MarketData>;
  
  // Markets list
  markets: Market[];
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: string | null;
  
  // Last fetch timestamp
  lastFetch: number;
  
  // Whether data has been fetched at least once
  hasFetched: boolean;
  
  // Auto-refresh interval reference
  refreshInterval: NodeJS.Timeout | null;
  
  // Fetch market data for all markets from market addresses
  fetchMarketsDataFromAddresses: (marketAddresses: `0x${string}`[]) => Promise<void>;
  
  // Fetch market data for a specific market
  fetchSingleMarketData: (marketAddress: `0x${string}`) => Promise<void>;
  
  // Start auto-refresh
  startAutoRefresh: (intervalMs?: number) => void;
  
  // Stop auto-refresh
  stopAutoRefresh: () => void;
  
  // Clear error
  clearError: () => void;
  
  // Clear all data
  clearAll: () => void;
}

export const useMarketsStore = create<MarketsState>((set, get) => ({
  marketsData: {},
  markets: [],
  isLoading: false,
  error: null,
  lastFetch: 0,
  hasFetched: false,
  refreshInterval: null,
  
  fetchMarketsDataFromAddresses: async (marketAddresses: `0x${string}`[]) => {
    const currentState = get();
    
    // Don't fetch if already loading
    if (currentState.isLoading) return;
    
    set({
      isLoading: true,
      error: null,
    });
    
    try {
      const publicClient = getPublicClient();
      
      // Fetch complete data for all markets in parallel
      const marketDataPromises = marketAddresses.map(async (marketAddress) => {
        try {
          // Step 1: Fetch cToken basic info
          const basicInfo = await fetchMarketBasicInfo(marketAddress);
          if (!basicInfo) return null;

          // Step 2: Get token info (use native config for native tokens)
          let tokenInfo;
          if (basicInfo.isNative) {
            // Use native token configuration
            tokenInfo = {
              symbol: NATIVE_TOKEN.symbol,
              name: NATIVE_TOKEN.name,
              decimals: NATIVE_TOKEN.decimals,
            };
          } else {
            // Fetch underlying token info for ERC-20 tokens
            tokenInfo = await fetchTokenInfo(basicInfo.underlying);
            if (!tokenInfo) return null;
          }

          // Step 3: Build Market object
          const market: Market = {
            address: marketAddress,
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            decimals: tokenInfo.decimals,
            underlyingAddress: basicInfo.isNative 
              ? TOKEN_CONFIGS.CELO.address 
              : basicInfo.underlying,
            isNative: basicInfo.isNative,
          };

          // Step 4: Fetch market data (rates, stats)
          const marketData = await fetchMarketData(market, publicClient);
          return marketData;
        } catch (error) {
          console.error(`Error fetching market data for ${marketAddress}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(marketDataPromises);
      
      // Build the markets data map and markets list
      const newMarketsData: Record<string, MarketData> = {};
      const newMarkets: Market[] = [];
      let successCount = 0;
      
      for (const result of results) {
        if (result) {
          newMarketsData[result.address] = result;
          newMarkets.push({
            address: result.address,
            symbol: result.symbol,
            name: result.name,
            decimals: result.decimals,
            underlyingAddress: result.underlyingAddress || TOKEN_CONFIGS.CELO.address,
            isNative: result.symbol === NATIVE_TOKEN.symbol,
          });
          successCount++;
        }
      }
      
      if (successCount === 0) {
        throw new Error('Failed to fetch any market data');
      }
      
      set({
        marketsData: newMarketsData,
        markets: newMarkets,
        isLoading: false,
        error: null,
        lastFetch: Date.now(),
        hasFetched: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market data';
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },
  
  fetchSingleMarketData: async (marketAddress: `0x${string}`) => {
    try {
      const publicClient = getPublicClient();
      const state = get();
      const market = state.markets.find(m => m.address.toLowerCase() === marketAddress.toLowerCase());
      
      if (!market) {
        console.error(`Market not found: ${marketAddress}`);
        return;
      }
      
      const marketData = await fetchMarketData(market, publicClient);
      
      if (marketData) {
        set((state) => ({
          marketsData: {
            ...state.marketsData,
            [marketAddress]: marketData,
          },
          lastFetch: Date.now(),
        }));
      }
    } catch (err) {
      console.error(`Error fetching market data for ${marketAddress}:`, err);
    }
  },
  
  startAutoRefresh: (intervalMs: number = 60_000) => {
    const state = get();
    
    // Clear existing interval if any
    if (state.refreshInterval) {
      clearInterval(state.refreshInterval);
    }
    
    // Set up new interval
    const interval = setInterval(async () => {
      const currentState = get();
      const { markets } = currentState;
      
      if (markets.length > 0) {
        const marketAddresses = markets.map(m => m.address) as `0x${string}`[];
        await currentState.fetchMarketsDataFromAddresses(marketAddresses);
      }
    }, intervalMs);
    
    set({ refreshInterval: interval });
  },
  
  stopAutoRefresh: () => {
    const state = get();
    if (state.refreshInterval) {
      clearInterval(state.refreshInterval);
      set({ refreshInterval: null });
    }
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  clearAll: () => {
    get().stopAutoRefresh();
    set({
      marketsData: {},
      markets: [],
      isLoading: false,
      error: null,
      lastFetch: 0,
      hasFetched: false,
    });
  },
}));

// Selectors for convenient data access
export const selectMarketsData = (state: MarketsState) => state.marketsData;

export const selectMarkets = (state: MarketsState) => state.markets;

export const selectMarketsArray = (state: MarketsState): MarketData[] => 
  Object.values(state.marketsData);

export const selectIsLoading = (state: MarketsState) => state.isLoading;

export const selectError = (state: MarketsState) => state.error;

export const selectHasFetched = (state: MarketsState) => state.hasFetched;

export const selectLastFetch = (state: MarketsState) => state.lastFetch;

// Get market data by address
export const selectMarketByAddress = (state: MarketsState, address: string) => 
  state.marketsData[address.toLowerCase()] || state.marketsData[address];

// Get market data by symbol
export const selectMarketBySymbol = (state: MarketsState, symbol: string) => 
  Object.values(state.marketsData).find(m => m.symbol.toLowerCase() === symbol.toLowerCase());