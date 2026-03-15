import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useHistoricalPrices } from '../../hooks/useHistoricalPrices';
import { TOKEN_CONFIG, TOKEN_ICONS } from '../../utils/tokenConfig.js';

export const MarketDetail = ({ market, onBack }) => {
  const [activeTab, setActiveTab] = useState('supply');
  const [amount, setAmount] = useState('');
  const [timeRange, setTimeRange] = useState('1M');

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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
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
              <span className="text-green-400 text-sm font-medium">Supply: {market.supplyApy}%</span>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-2">
              <span className="text-blue-400 text-sm font-medium">Borrow: {market.borrowApy}%</span>
            </div>
          </div>
        </div>

        {/* Market Title with Icon */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <img 
              src={market.icon} 
              alt={market.symbol} 
              className="w-20 h-20 rounded-full border-4 border-accent-cyan/20 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-bg-secondary flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent mb-2">
              {market.name}
            </h1>
            <p className="text-lg text-text-secondary">{market.symbol} Market Details</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-5 hover:border-accent-cyan/50 transition-all">
            <p className="text-text-secondary text-sm font-medium mb-2">Total Supply</p>
            <p className="text-2xl font-bold text-text-primary">{market.totalSupply}</p>
          </div>
          <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-5 hover:border-accent-cyan/50 transition-all">
            <p className="text-text-secondary text-sm font-medium mb-2">Total Borrowed</p>
            <p className="text-2xl font-bold text-text-primary">{market.totalBorrow}</p>
          </div>
          <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-5 hover:border-accent-cyan/50 transition-all">
            <p className="text-text-secondary text-sm font-medium mb-2">Symbol</p>
            <p className="text-2xl font-bold text-accent-cyan">{market.symbol}</p>
          </div>
        </div>
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
              {activeTab === 'supply' ? 'Wallet Balance' : 'Borrow Limit'}: 0.00 {market.symbol}
            </span>
          </div>

          {/* APY Info */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Supply APY</span>
              <span className="text-green-400 font-semibold">{market.supplyApy}%</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">Borrow APY</span>
              <span className="text-blue-400 font-semibold">{market.borrowApy}%</span>
            </div>
          </div>

          {/* Action Button */}
          <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg">
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
    </div>
  );
};