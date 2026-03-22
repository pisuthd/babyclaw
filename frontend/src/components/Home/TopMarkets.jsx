import { useMarketsArray, useMarketsLoading, useMarketsError } from '../../hooks/useMarketsStore';
import { usePrices } from '../../hooks/usePrices';
import { formatUnits } from 'viem';

// Token icons for display
const TOKEN_ICONS = {
  CELO: '/celo-icon.png',
  BABY: '/babyclaw-icon.png',
  "USD₮": '/usdt-icon.png',
};

function TopMarkets() {
  const markets = useMarketsArray();
  const isLoading = useMarketsLoading();
  const error = useMarketsError();
  const { prices } = usePrices();
  
  // Format markets for display, sorted by supply APY (highest first)
  const formattedMarkets = markets
    .map(market => {
      const price = prices[market.symbol];
      const totalSupplyToken = parseFloat(formatUnits(market.stats.totalSupply, market.decimals));
      const totalBorrowsToken = parseFloat(formatUnits(market.stats.totalBorrows, market.decimals));
      
      return {
        icon: TOKEN_ICONS[market.symbol] || '/babyclaw-icon.png',
        symbol: market.symbol,
        supplyApy: market.rates.supplyApy,
        borrowApy: market.rates.borrowApy,
        totalSupply: price ? totalSupplyToken * price : 0,
        totalBorrowed: price ? totalBorrowsToken * price : 0,
        utilization: market.stats.utilizationRate * 100,
      };
    })
    .sort((a, b) => b.supplyApy - a.supplyApy);

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
    return '$' + value.toLocaleString();
  };

  return (
    <section className="px-4 md:px-8 py-16 md:py-20 bg-bg-secondary/50 relative overflow-hidden">
      {/* TopMarkets-specific ambient glow effects */}
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-accent-cyan/3 rounded-full blur-3xl -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-accent-cyan/3 rounded-full blur-3xl -translate-y-1/2"></div>
      
      <div className="relative max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-text-primary">Live Markets</h2>
        <p className="text-lg md:text-xl text-center mb-12 md:mb-16 text-text-muted">Real-time lending rates — actively monitored and optimized by BABY</p>

        <div className="overflow-x-auto rounded-xl shadow-lg max-w-4xl mx-auto">
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
                  className="border-b border-border-color hover:bg-accent-cyan/5 transition-all hover:scale-[1.01]"
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
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-accent-cyan font-space">{formatApy(market.supplyApy)}</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-accent-cyan font-space">{formatApy(market.borrowApy)}</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">{formatCurrency(market.totalSupply)}</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">{formatCurrency(market.totalBorrowed)}</td>
                  <td className={`px-4 md:px-5 py-4 md:py-5 font-semibold font-space ${getUtilizationClass(market.utilization)}`}>
                    {market.utilization.toFixed(2)}%
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default TopMarkets;