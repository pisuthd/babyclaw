/**
 * Markets Store (Zustand)
 * Global state management for market data on CELO chain
 * Fetches real data from blockchain contracts and auto-refreshes every 60 seconds
 * CELO chain only - no multi-chain support
 */

import { create } from 'zustand';
import { NATIVE_TOKEN, TOKEN_CONFIGS, CHAIN } from '../contracts/config.js';
import { createPublicClient, http } from 'viem';

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
];

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
];

// Public client for contract calls
let publicClient;

function getPublicClient() {
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
async function fetchMarketBasicInfo(marketAddress) {
  try {
    const client = getPublicClient();
    
    // Try to get underlying address - if it fails, this is a native token market
    let underlying = null;
    try {
      underlying = await client.readContract({
        address: marketAddress,
        abi: CTOKEN_ABI,
        functionName: 'underlying',
      });
    } catch {
      // Native token markets don't have underlying() function
    }

    const [symbol, name, decimals] = await Promise.all([
      client.readContract({
        address: marketAddress,
        abi: CTOKEN_ABI,
        functionName: 'symbol',
      }),
      client.readContract({
        address: marketAddress,
        abi: CTOKEN_ABI,
        functionName: 'name',
      }),
      client.readContract({
        address: marketAddress,
        abi: CTOKEN_ABI,
        functionName: 'decimals',
      }),
    ]);

    const isNative = !underlying;

    return {
      underlying: underlying || '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      symbol: symbol,
      name: name,
      decimals: decimals,
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
async function fetchTokenInfo(tokenAddress) {
  try {
    const client = getPublicClient();
    
    const [symbol, name, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name',
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
    ]);

    return {
      symbol: symbol,
      name: name,
      decimals: decimals,
    };
  } catch (error) {
    console.error(`Error fetching token info for ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Fetch market data (standalone function for use in store)
 */
async function fetchMarketData(market, client) {
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
    const blockRateToApy = (ratePerBlock) => {
      if (ratePerBlock === 0n) return 0;
      const ratePerYear = ratePerBlock * BLOCKS_PER_YEAR;
      const apy = (Number(ratePerYear) / 1e18) * 100;
      return apy;
    };

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
        cash: cash,
        totalBorrows: totalBorrows,
        totalReserves: 0n,
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

export const useMarketsStore = create((set, get) => ({
  marketsData: {},
  markets: [],
  isLoading: false,
  error: null,
  lastFetch: 0,
  hasFetched: false,
  refreshInterval: null,
  
  fetchMarketsDataFromAddresses: async (marketAddresses) => {
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
          const market = {
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
      const newMarketsData = {};
      const newMarkets = [];
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
  
  fetchSingleMarketData: async (marketAddress) => {
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
  
  startAutoRefresh: (intervalMs = 60_000) => {
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
        const marketAddresses = markets.map(m => m.address);
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
export const selectMarketsData = (state) => state.marketsData;

export const selectMarkets = (state) => state.markets;

export const selectMarketsArray = (state) => Object.values(state.marketsData);

export const selectIsLoading = (state) => state.isLoading;

export const selectError = (state) => state.error;

export const selectHasFetched = (state) => state.hasFetched;

export const selectLastFetch = (state) => state.lastFetch;

// Get market data by address
export const selectMarketByAddress = (state, address) => 
  state.marketsData[address.toLowerCase()] || state.marketsData[address];

// Get market data by symbol
export const selectMarketBySymbol = (state, symbol) => 
  Object.values(state.marketsData).find(m => m.symbol.toLowerCase() === symbol.toLowerCase());