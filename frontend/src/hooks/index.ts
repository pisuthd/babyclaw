/**
 * BabyClaw Lending Hooks
 * 
 * Exports all hooks for interacting with the BabyClaw lending protocol on CELO.
 * CELO chain only - no multi-chain support.
 */

// Comptroller hooks
export {
  useComptrollerContract,
  useUserMarkets,
  useMarketInfo,
  useAccountLiquidity,
} from './useComptrollerContract.js';

// Market contract hooks
export {
  useMarketBasicInfo,
  useMarketRates,
  useMarketStats,
  useUserMarketData,
  getMarketAddressByToken,
  getAllMarketAddresses,
  getAllMarketSymbols,
  type MarketBasicInfo,
  type MarketRates,
  type MarketStats,
  type UserMarketData,
} from './useMarketContract.js';

// Markets hooks
export {
  getAllMarkets,
  getMarketByAddress,
  getMarketBySymbol,
  getCTokenAddress,
  isValidMarket,
  getMarketSymbols,
  getMarketAddresses,
  useMarkets,
  type Market,
} from './useMarkets.js';

// Market data hooks (with APY calculations)
export {
  useMarketData,
  fetchMarketData,
  formatMarketData,
  type MarketData,
} from './useMarketsData.js';

// Token info hooks
export {
  useTokenInfo,
  useAllTokenInfo,
  getTokenInfoFromConfig,
  fetchTokenInfo,
  getAllTokenInfo,
  type TokenInfo,
} from './useTokenInfo.js';

// Price hooks
export {
  usePrice,
  usePrices,
  usePriceData,
  usePricesLoading,
  usePricesError,
  useRefreshPrices,
  type PricesState,
} from './usePrices.js';

// Markets store hooks (with auto-refresh)
export {
  useMarkets as useMarketsStore,
  useMarketsArray,
  useMarketByAddress,
  useMarketBySymbol,
  useMarketsList,
  useMarketsLoading,
  useMarketsError,
  useMarketsFetched,
  useMarketsLastFetch,
  useRefreshMarkets,
  useRefreshMarket,
  type MarketsState,
} from './useMarketsStore.js';
