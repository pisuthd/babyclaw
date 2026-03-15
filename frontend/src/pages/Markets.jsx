import { useState, useMemo } from 'react';
import { useMarketsArray, useMarketsLoading, useMarketsError } from '../hooks/useMarketsStore';
import { usePrices } from '../hooks/usePrices';
import { formatUnits } from 'viem';
import { MarketDetail } from '../components/Markets/MarketDetail';

// Token icons for display
const TOKEN_ICONS = {
  CELO: '/celo-icon.png',
  BABY: '/babyclaw-icon.png',
  "USD₮": '/usdt-icon.png',
};

function Markets() {
  const markets = useMarketsArray();
  const isLoading = useMarketsLoading();
  const error = useMarketsError();
  const { prices } = usePrices();
  const [selectedMarket, setSelectedMarket] = useState(null);

  // Format markets for display
  const formattedMarkets = useMemo(() => {
    return markets
      .map(market => {
        const price = prices[market.symbol];
        const totalSupplyToken = parseFloat(formatUnits(market.stats.totalSupply, market.decimals));
        const totalBorrowsToken = parseFloat(formatUnits(market.stats.totalBorrows, market.decimals));
        
        return {
          ...market,
          icon: TOKEN_ICONS[market.symbol] || '/babyclaw-icon.png',
          totalSupplyUSD: price ? totalSupplyToken * price : 0,
          totalBorrowedUSD: price ? totalBorrowsToken * price : 0,
        };
      })
      .sort((a, b) => b.rates.supplyApy - a.rates.supplyApy);
  }, [markets, prices]);

  // Calculate protocol stats
  const stats = useMemo(() => {
    if (formattedMarkets.length === 0) {
      return {
        totalSupply: 0,
        totalBorrow: 0,
        totalLiquidity: 0,
        bestSupplyApy: 0,
      };
    }

    const totalSupply = formattedMarkets.reduce((sum, m) => sum + m.totalSupplyUSD, 0);
    const totalBorrow = formattedMarkets.reduce((sum, m) => sum + m.totalBorrowedUSD, 0);
    const bestSupplyApy = Math.max(...formattedMarkets.map(m => m.rates.supplyApy));
    const totalLiquidity = totalSupply - totalBorrow;

    return {
      totalSupply,
      totalBorrow,
      totalLiquidity,
      bestSupplyApy,
    };
  }, [formattedMarkets]);

  const formatApy = (apy) => {
    if (apy === 0) return '0.00%';
    return `${apy.toFixed(2)}%`;
  };

  const getUtilizationClass = (util) => {
    if (util < 60) return 'text-green-500';
    if (util < 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatCurrency = (value) => {
    if (value === 0) return '$0.00';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatLargeCurrency = (value) => {
    if (value === 0) return '$0.00';
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Market Details View
  if (selectedMarket) {
    return (
      <MarketDetail 
        market={{
          symbol: selectedMarket.symbol,
          name: selectedMarket.symbol,
          icon: selectedMarket.icon,
          supplyApy: selectedMarket.rates.supplyApy,
          borrowApy: selectedMarket.rates.borrowApy,
          totalSupply: formatCurrency(selectedMarket.totalSupplyUSD),
          totalBorrow: formatCurrency(selectedMarket.totalBorrowedUSD),
        }}
        onBack={() => setSelectedMarket(null)}
      />
    );
  }

  // Markets List View
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
          Markets
        </h1>
        <p className="text-lg text-text-secondary">Explore lending and borrowing markets</p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
        <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-text-secondary text-sm font-medium">Total Supply</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-text-primary">
            {formatLargeCurrency(stats.totalSupply)}
          </p>
        </div>

        <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <span className="text-text-secondary text-sm font-medium">Total Borrow</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-text-primary">
            {formatLargeCurrency(stats.totalBorrow)}
          </p>
        </div>

        <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-text-secondary text-sm font-medium">Total Liquidity</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-text-primary">
            {formatLargeCurrency(stats.totalLiquidity)}
          </p>
        </div>

        <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-text-secondary text-sm font-medium">Best Supply APY</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-accent-cyan">
            {formatApy(stats.bestSupplyApy)}
          </p>
        </div>
      </div>

      {/* Markets Table */}
      <div className="overflow-x-auto rounded-xl shadow-lg">
        <table className="w-full bg-bg-secondary/80 border border-border-color rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-accent-cyan/10 border-b-2 border-accent-cyan">
              <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Asset</th>
              <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Supply APY</th>
              <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Borrow APY</th>
              <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Total Supply</th>
              <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Total Borrowed</th>
              <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 md:px-5 py-8 text-center text-text-muted">
                  Loading markets...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 md:px-5 py-8 text-center text-red-500">
                  Error loading markets: {error}
                </td>
              </tr>
            ) : formattedMarkets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 md:px-5 py-8 text-center text-text-muted">
                  No markets available
                </td>
              </tr>
            ) : (
              formattedMarkets.map((market, index) => (
                <tr
                  key={index}
                  onClick={() => setSelectedMarket(market)}
                  className="border-b border-border-color hover:bg-accent-cyan/10 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <td className="px-4 md:px-5 py-4 md:py-5">
                    <div className="flex items-center gap-3">
                      <img 
                        src={market.icon} 
                        alt={market.symbol} 
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-semibold text-base md:text-lg text-text-primary">{market.symbol}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-accent-cyan font-space">{formatApy(market.rates.supplyApy)}</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-accent-cyan font-space">{formatApy(market.rates.borrowApy)}</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">{formatCurrency(market.totalSupplyUSD)}</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">{formatCurrency(market.totalBorrowedUSD)}</td>
                  <td className={`px-4 md:px-5 py-4 md:py-5 font-semibold font-space ${getUtilizationClass(market.stats.utilizationRate * 100)}`}>
                    {(market.stats.utilizationRate * 100).toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { Markets };