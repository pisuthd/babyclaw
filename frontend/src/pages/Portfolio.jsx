import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMarketsArray } from '../hooks/useMarketsStore';
import { useUserMarketData, useMarketRates } from '../hooks/useMarketContract';
import { usePrices } from '../hooks/usePrices';
import { formatUnits } from 'viem';
import { CTOKEN_ADDRESSES } from '../contracts/config.js';
import { ActionModal } from '../components/Portfolio/ActionModal';

// Token icons for display
const ICON_MAP = {
  CELO: '/celo-icon.png',
  BABY: '/babyclaw-icon.png',
  "USD₮": '/usdt-icon.png',
};

function formatTokenAmount(balance, decimals) {
  if (!balance || balance === 0) return '0.000000';
  return balance.toLocaleString('en-US', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6
  });
}

function Portfolio() {
  const [activeTab, setActiveTab] = useState('supply');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { address } = useAccount();
  const markets = useMarketsArray();
  const { prices } = usePrices();

  // Call hooks for each market at the top level (fixed number - 3 markets)
  const celoAddress = CTOKEN_ADDRESSES['CELO'];
  const babyAddress = CTOKEN_ADDRESSES['BABY'];
  const usdtAddress = CTOKEN_ADDRESSES['USD₮'];

  const { data: celoUserData } = useUserMarketData(celoAddress, address);
  const { data: celoRates } = useMarketRates(celoAddress);
  
  const { data: babyUserData } = useUserMarketData(babyAddress, address);
  const { data: babyRates } = useMarketRates(babyAddress);
  
  const { data: usdtUserData } = useUserMarketData(usdtAddress, address);
  const { data: usdtRates } = useMarketRates(usdtAddress);

  // Map user data to markets
  const marketUserDataMap = useMemo(() => {
    return {
      'CELO': { userData: celoUserData, rates: celoRates },
      'BABY': { userData: babyUserData, rates: babyRates },
      'USD₮': { userData: usdtUserData, rates: usdtRates },
    };
  }, [celoUserData, celoRates, babyUserData, babyRates, usdtUserData, usdtRates]);

  // Calculate user positions
  const userPositions = useMemo(() => {
    if (!markets.length) return [];

    return markets.map(market => {
      const { userData, rates } = marketUserDataMap[market.symbol] || {};
      
      // Skip if no user data yet (still loading or no data available)
      if (!userData) return null;

      // Use getAccountSnapshot data: cTokenBalance, borrowBalanceStored, exchangeRateMantissa
      const cTokenBalanceRaw = userData.cTokenBalance || 0n;
      const borrowBalanceRaw = userData.borrowBalanceStored || 0n;
      const exchangeRateMantissa = userData.exchangeRateMantissa || 0n;

      // Calculate supply balance: cTokenBalance * exchangeRateMantissa / 10^18
      const supplyBalanceRaw = (cTokenBalanceRaw * exchangeRateMantissa) / (10n ** 18n);
      
      const supplyBalance = parseFloat(formatUnits(supplyBalanceRaw, market.decimals));
      const borrowBalance = parseFloat(formatUnits(borrowBalanceRaw, market.decimals));
      const price = prices[market.symbol] || 1;

      return {
        symbol: market.symbol,
        icon: ICON_MAP[market.symbol] || market.icon || '/babyclaw-icon.png',
        decimals: market.decimals,
        supplyBalance: supplyBalance,
        borrowBalance: borrowBalance,
        supplyUSD: supplyBalance * price,
        borrowUSD: borrowBalance * price,
        supplyApy: market.rates.supplyApy,
        borrowApy: market.rates.borrowApy,
        collateralFactor: market.rates.collateralFactor || 0,
      };
    }).filter(Boolean);
  }, [markets, marketUserDataMap, prices]);

  // Check if any data is still loading
  const isLoadingData = useMemo(() => {
    return markets.some(market => {
      const { userData } = marketUserDataMap[market.symbol] || {};
      return !userData;
    });
  }, [markets, marketUserDataMap]);

  // Filter positions based on active tab
  const supplyPositions = useMemo(() => {
    return userPositions.filter(p => p.supplyBalance > 0);
  }, [userPositions]);

  const borrowPositions = useMemo(() => {
    return userPositions.filter(p => p.borrowBalance > 0);
  }, [userPositions]);

  // Calculate totals
  const totalSupplyUSD = useMemo(() => {
    return supplyPositions.reduce((sum, p) => sum + p.supplyUSD, 0);
  }, [supplyPositions]);

  const totalBorrowUSD = useMemo(() => {
    return borrowPositions.reduce((sum, p) => sum + p.borrowUSD, 0);
  }, [borrowPositions]);

  const weightedSupplyAPY = useMemo(() => {
    if (totalSupplyUSD === 0) return 0;
    const weightedSum = supplyPositions.reduce((sum, p) => {
      return sum + (p.supplyUSD * p.supplyApy);
    }, 0);
    return weightedSum / totalSupplyUSD;
  }, [supplyPositions, totalSupplyUSD]);

  const formatAPY = (apy) => {
    if (apy === null || apy === undefined) return '0.00%';
    return `${apy.toFixed(2)}%`;
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

  const formatCurrencyExact = (value) => {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const handleWithdraw = (position) => {
    setSelectedPosition(position);
    setModalType('withdraw');
    setIsModalOpen(true);
  };

  const handleRepay = (position) => {
    setSelectedPosition(position);
    setModalType('repay');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPosition(null);
    setModalType(null);
  };

  if (!address) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center py-20">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-lg text-text-secondary">
            Please connect your wallet to view your portfolio
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
          Your Portfolio
        </h1>
        <p className="text-lg text-text-secondary">Manage your lending and borrowing positions</p>
      </div>

      {/* Stats Summary */}
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
            {formatCurrencyExact(totalSupplyUSD)}
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
            {formatCurrencyExact(totalBorrowUSD)}
          </p>
        </div>

        <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-text-secondary text-sm font-medium">Net Value</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-text-primary">
            {formatCurrencyExact(totalSupplyUSD - totalBorrowUSD)}
          </p>
        </div>

        <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-border-color p-6 hover:border-accent-cyan/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-text-secondary text-sm font-medium">Avg Supply APY</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-accent-cyan">
            {formatAPY(weightedSupplyAPY)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex gap-4 border-b border-border-color">
          <button
            onClick={() => setActiveTab('supply')}
            className={`pb-4 px-6 font-semibold transition-all border-b-2 ${
              activeTab === 'supply'
                ? 'text-accent-cyan border-accent-cyan'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            Supply Positions ({supplyPositions.length})
          </button>
          <button
            onClick={() => setActiveTab('borrow')}
            className={`pb-4 px-6 font-semibold transition-all border-b-2 ${
              activeTab === 'borrow'
                ? 'text-accent-cyan border-accent-cyan'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            Borrow Positions ({borrowPositions.length})
          </button>
        </div>
      </div>

      {/* Supply Positions Table */}
      {activeTab === 'supply' && (
        <div className="overflow-x-auto rounded-xl shadow-lg">
          <table className="w-full bg-bg-secondary/80 border border-border-color rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-accent-cyan/10 border-b-2 border-accent-cyan">
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Asset</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Supplied Balance</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Value (USD)</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Supply APY</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Earnings</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {supplyPositions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 md:px-5 py-8 text-center text-text-muted">
                    No supply positions
                  </td>
                </tr>
              ) : (
                supplyPositions.map((position, index) => (
                  <tr
                    key={index}
                    className="border-b border-border-color hover:bg-accent-cyan/5 transition-all"
                  >
                    <td className="px-4 md:px-5 py-4 md:py-5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={position.icon} 
                          alt={position.symbol} 
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="font-semibold text-base md:text-lg text-text-primary">{position.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">
                      {formatTokenAmount(position.supplyBalance, position.decimals)} {position.symbol}
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">
                      {formatCurrencyExact(position.supplyUSD)}
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-accent-cyan font-space">
                      {formatAPY(position.supplyApy)}
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-green-400 font-space">
                      {formatCurrency(position.supplyUSD * (position.supplyApy / 100))}
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5">
                      <button
                        onClick={() => handleWithdraw(position)}
                        className="px-4 py-2 bg-accent-cyan text-bg-primary font-semibold rounded-lg hover:bg-accent-cyan-hover transition-all text-sm"
                      >
                        Withdraw
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Borrow Positions Table */}
      {activeTab === 'borrow' && (
        <div className="overflow-x-auto rounded-xl shadow-lg">
          <table className="w-full bg-bg-secondary/80 border border-border-color rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-accent-cyan/10 border-b-2 border-accent-cyan">
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Asset</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Borrowed Balance</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Value (USD)</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Borrow APR</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Collateral</th>
                <th className="px-4 md:px-5 py-3 md:py-4 text-left font-semibold text-accent-cyan font-space text-xs md:text-sm uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {borrowPositions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 md:px-5 py-8 text-center text-text-muted">
                    No borrow positions
                  </td>
                </tr>
              ) : (
                borrowPositions.map((position, index) => (
                  <tr
                    key={index}
                    className="border-b border-border-color hover:bg-accent-cyan/5 transition-all"
                  >
                    <td className="px-4 md:px-5 py-4 md:py-5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={position.icon} 
                          alt={position.symbol} 
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="font-semibold text-base md:text-lg text-text-primary">{position.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">
                      {formatTokenAmount(position.borrowBalance, position.decimals)} {position.symbol}
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">
                      {formatCurrencyExact(position.borrowUSD)}
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-accent-cyan font-space">
                      {formatAPY(position.borrowApy)}
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5 font-medium text-text-secondary font-space">
                      {position.collateralFactor > 0 ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 md:px-5 py-4 md:py-5">
                      <button
                        onClick={() => handleRepay(position)}
                        className="px-4 py-2 bg-accent-cyan text-bg-primary font-semibold rounded-lg hover:bg-accent-cyan-hover transition-all text-sm"
                      >
                        Repay
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      <ActionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        type={modalType}
        position={selectedPosition}
      />
    </div>
  );
}

export { Portfolio };