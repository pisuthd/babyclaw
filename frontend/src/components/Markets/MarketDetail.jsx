import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useHistoricalPrices } from '../../hooks/useHistoricalPrices';
import { useUserBalance, formatBalance } from '../../hooks/useUserBalance';
import { useBorrowLimit, formatUSD } from '../../hooks/useBorrowLimit';
import { TOKEN_CONFIG } from '../../utils/tokenConfig.js';
import { TransactionModal } from './TransactionModal';
import { usePrices } from '../../hooks/usePrices';

export const MarketDetail = ({ market, onBack }) => {
  const [activeTab, setActiveTab] = useState('supply');
  const [amount, setAmount] = useState('');
  const [timeRange, setTimeRange] = useState('1M');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { prices } = usePrices();
  const { data: userBalance, isLoading: balanceLoading } = useUserBalance(market.symbol);
  const { borrowLimitUSD, healthFactor, isLoading: borrowLimitLoading } = useBorrowLimit();
 

  const {
    data,
    isLoading,
    error,
    refetch,
    currentPrice,
    priceChange,
    priceChangePercent,
    periodHigh,
    periodLow,
  } = useHistoricalPrices({
    symbol: market.symbol,
    timeRange,
    enabled: true,
  });

  const tokenConfig = TOKEN_CONFIG[market.symbol];

  const formatAPY = (apy) => {
    if (apy === null || apy === undefined) return '0.00%';
    return `${parseFloat(apy).toFixed(2)}%`;
  };

  const formatPrice = (price) => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatPercent = (percent) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-white font-semibold">{formatPrice(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  // Calculate Y-axis domain with padding for better visibility
  const getYAxisDomain = () => {
    if (!data || data.length === 0) return [0, 0];
    
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const padding = range * 0.1; // 10% padding
    
    return [min - padding, max + padding];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      {/* Header Container */}
      <div className="bg-bg-secondary/30 backdrop-blur-sm border border-border-color rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
          >
            <svg 
              className="w-5 h-5 group-hover:-translate-x-1 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Markets</span>
          </button>
          <div className="flex gap-3">
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
              <span className="text-green-400 text-sm font-medium">Supply: {formatAPY(market.supplyApy)}</span>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-2">
              <span className="text-blue-400 text-sm font-medium">Borrow: {formatAPY(market.borrowApy)}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Market Title with Large Icon */}
        <div className="flex items-center gap-8 mb-8">
          <div className="relative">
            {/* Icon Container with Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan to-blue-600 rounded-full blur-xl opacity-30"></div>
            <div className="relative">
              <img 
                src={market.icon} 
                alt={market.symbol} 
                className="w-24 h-24 rounded-full border-4 border-accent-cyan/30 shadow-2xl"
              />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-accent-cyan to-blue-600 rounded-full border-3 border-bg-secondary flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
                {market.name}
              </h1>
              <div className="bg-accent-cyan/20 border border-accent-cyan/40 rounded-full px-4 py-1">
                <span className="text-accent-cyan text-sm font-bold">{market.symbol}</span>
              </div>
            </div>
            <p className="text-xl text-text-secondary font-medium">Lending Market Details</p>
          </div>
        </div>

        {/* Enhanced Quick Stats */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bg-primary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium">Total Supply</p>
            </div>
            <p className="text-2xl font-bold text-text-primary">{market.totalSupply}</p>
          </div>
          <div className="bg-bg-primary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium">Total Borrowed</p>
            </div>
            <p className="text-2xl font-bold text-text-primary">{market.totalBorrow}</p>
          </div>
          <div className="bg-bg-primary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium">Market Symbol</p>
            </div>
            <p className="text-2xl font-bold text-accent-cyan">{market.symbol}</p>
          </div>
        </div> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Section - Market Actions */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('supply')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'supply'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
              }`}
            >
              Supply
            </button>
            <button
              onClick={() => setActiveTab('borrow')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'borrow'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
              }`}
            >
              Borrow
            </button>
          </div>

          {/* Token Display */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-gray-700/50 rounded-lg">
            <img src={market.icon} alt={market.symbol} className="w-12 h-12 rounded-full" />
            <div>
              <p className="text-white font-semibold">{market.name}</p>
              <p className="text-gray-400 text-sm">{market.symbol}</p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setAmount('10000')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-blue-400 hover:text-blue-300"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="flex justify-between items-center mb-6 text-sm">
            <span className="text-gray-400">
              {activeTab === 'supply' ? 'Wallet Balance' : 'Borrow Limit'}:{' '}
              {activeTab === 'supply' ? (
                balanceLoading ? (
                  'Loading...'
                ) : (
                  `${formatBalance(userBalance, tokenConfig?.decimals || 18)} ${market.symbol}`
                )
              ) : borrowLimitLoading ? (
                'Loading...'
              ) : (
                formatUSD(borrowLimitUSD)
              )}
            </span>
            {activeTab === 'supply' && !balanceLoading && (
              <button
                onClick={() => setAmount(formatBalance(userBalance, tokenConfig?.decimals || 18))}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                Set MAX
              </button>
            )}
          </div>

          {/* APY Info */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Supply APY</span>
              <span className="text-green-400 font-semibold">{formatAPY(market.supplyApy)}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">Borrow APY</span>
              <span className="text-blue-400 font-semibold">{formatAPY(market.borrowApy)}</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeTab === 'supply' ? 'Preview Supply' : 'Preview Borrow'}
          </button>
        </div>

        {/* Right Section - Price Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          {/* Chart Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">{market.symbol} Price Chart</h2>
            <div className="flex gap-2">
              {['1D', '1W', '1M', '1Y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Price Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Current Price</p>
              <p className="text-white font-semibold text-sm">{formatPrice(currentPrice)}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Period Change</p>
              <p
                className={`font-semibold text-sm ${
                  priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatPercent(priceChangePercent)}
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">24h Volume</p>
              <p className="text-white font-semibold text-sm">
                {data.length > 0 ? '$1.2M' : '-'}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-64 mb-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="mb-2">{error}</p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>No price data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatPrice(value)}
                    domain={getYAxisDomain()}
                    allowDataOverflow={true}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Period High</p>
              <p className="text-green-400 font-semibold text-sm">{formatPrice(periodHigh)}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Period Low</p>
              <p className="text-red-400 font-semibold text-sm">{formatPrice(periodLow)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={activeTab}
        amount={amount}
        market={{
          ...market,
          price: prices[market.symbol] || 1,
        }}
      />
    </div>
  );
};
