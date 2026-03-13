import { useState, useEffect } from 'react';

function TopMarkets() {
  
  const [markets, setMarkets] = useState([
    { asset: '🔵 USDC', symbol: 'USDC', supplyApy: 8.5, borrowApy: 10.2, totalSupply: 25450, totalBorrowed: 12380, utilization: 48.6 },
    { asset: '🟠 USDT', symbol: 'USDT', supplyApy: 7.8, borrowApy: 9.5, totalSupply: 18920, totalBorrowed: 11250, utilization: 59.5 },
    { asset: '🟢 USDm', symbol: 'USDm', supplyApy: 9.2, borrowApy: 11.8, totalSupply: 22150, totalBorrowed: 15890, utilization: 71.7 },
  ]);

  const getUtilizationClass = (util) => {
    if (util < 60) return 'text-green-500';
    if (util < 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatCurrency = (value) => {
    return '$' + value.toLocaleString();
  };

  return (
    <section className="px-4 md:px-8 py-16 md:py-20 bg-bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-text-primary">Live Markets</h2>
        <p className="text-lg md:text-xl text-center mb-12 md:mb-16 text-text-muted">Real-time lending rates and market data</p>

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
              {markets.map((market, index) => (
                <tr
                  key={index}
                  className="border-b border-border-color hover:bg-accent-cyan/5 transition-all hover:scale-[1.01]"
                >
                  <td className="px-4 md:px-5 py-4 md:py-5 font-semibold text-base md:text-lg text-text-primary">{market.asset}</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-accent-cyan font-space">{market.supplyApy}%</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-accent-cyan font-space">{market.borrowApy}%</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">{formatCurrency(market.totalSupply)}</td>
                  <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">{formatCurrency(market.totalBorrowed)}</td>
                  <td className={`px-4 md:px-5 py-4 md:py-5 font-semibold font-space ${getUtilizationClass(market.utilization)}`}>
                    {market.utilization}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default TopMarkets;