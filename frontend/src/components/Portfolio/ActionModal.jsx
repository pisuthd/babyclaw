import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWaitForTransactionReceipt } from 'wagmi';
import { useLendingActions } from '../../hooks/useLendingActions';
import { usePrices } from '../../hooks/usePrices';
import { useTokenAllowance } from '../../hooks/useTokenAllowance';
import { CTOKEN_ADDRESSES, TOKEN_CONFIGS, TOKEN_ADDRESSES } from '../../contracts/config.js';

export function ActionModal({ isOpen, onClose, type, position }) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [transactionResult, setTransactionResult] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [txHash, setTxHash] = useState(undefined);
  
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { prices } = usePrices();
  const { withdraw, repay, approve } = useLendingActions();

  // Get token allowance for ERC20 tokens
  const tokenAddress = TOKEN_ADDRESSES[position?.symbol];
  const { allowance } = useTokenAllowance(
    tokenAddress,
    address,
    CTOKEN_ADDRESSES[position?.symbol]
  );

  // Wait for transaction receipt
  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash,
    },
  });

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && receipt && txHash) {
      console.log('Transaction confirmed:', receipt);
      setTransactionResult({
        hash: txHash,
        status: 'confirmed'
      });
      setIsProcessing(false);
    }
  }, [isConfirmed, receipt, txHash]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setIsProcessing(false);
      setError(null);
      setTransactionResult(null);
      setTxHash(undefined);
      checkRequirements();
    }
  }, [isOpen, type, position, allowance]);

  const checkRequirements = async () => {
    if (!position?.symbol || !address) return;

    try {
      const isNative = position.symbol === 'CELO';
      
      // Check if token approval is needed (for ERC20 tokens only)
      if (type === 'repay' && !isNative) {
        const tokenConfig = TOKEN_CONFIGS[position.symbol];
        const decimals = tokenConfig?.decimals || 18;
        const amountWei = BigInt(Math.floor(parseFloat(amount || '0') * Math.pow(10, decimals)));
        
        setNeedsApproval(allowance < amountWei);
      } else {
        setNeedsApproval(false);
      }
    } catch (error) {
      console.error('Error checking requirements:', error);
      setNeedsApproval(false);
    }
  };

  // Re-check requirements when amount changes
  // useEffect(() => {
  //   if (isOpen && type === 'repay') {
  //     checkRequirements();
  //   }
  // }, [amount, allowance]);

  if (!isOpen || !position) return null;

  const maxAmount = type === 'withdraw' ? position.supplyBalance : position.borrowBalance;
  const price = prices[position.symbol] || 1;
  const amountNum = parseFloat(amount || '0');
  const amountUSD = amountNum * price;

  const handleMax = () => {
    setAmount(maxAmount.toFixed(6));
  };

  const handleConfirm = async () => {
    if (amountNum <= 0 || amountNum > maxAmount) {
      setError('Invalid amount');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Handle approvals and market entry if needed (before main transaction)
      if (type === 'repay') {
        const isNative = position.symbol === 'CELO';
        
        // Approve ERC20 token if needed
        if (needsApproval && !isNative) {
          console.log('Approving token...');
          const approvalResult = await approve(
            position.symbol, 
            CTOKEN_ADDRESSES[position.symbol], 
            amount
          );
          if (approvalResult.status === 'failed') {
            throw new Error(approvalResult.error || 'Approval failed');
          }
          // Wait for approval to confirm
          console.log('Waiting for approval confirmation...');
          await publicClient.waitForTransactionReceipt({ hash: approvalResult.hash });
          console.log('Approval confirmed!');
        }
      }

      // Execute main transaction (withdraw or repay)
      const result = type === 'withdraw'
        ? await withdraw(position.symbol, amount)
        : await repay(position.symbol, amount);

      if (result.hash) {
        setTxHash(result.hash);
        console.log('Main transaction sent, hash:', result.hash);
      } else if (result.status === 'failed') {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === 0) return '$0.00';
    if (value < 0.01) return `$${value.toFixed(4)}`;
    if (value < 1) return `$${value.toFixed(2)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${(value / 1000000).toFixed(2)}M`;
  };

  const formatAPY = (apy) => {
    if (apy === null || apy === undefined) return '0.00%';
    return `${parseFloat(apy).toFixed(2)}%`;
  };

  const getExplorerUrl = (txHash) => {
    return `https://celoscan.io/tx/${txHash}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-color rounded-2xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-color">
          <h2 className="text-2xl font-bold text-text-primary">
            {type === 'withdraw' ? 'Withdraw' : 'Repay'} {position.symbol}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            disabled={isProcessing}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Position Info */}
          <div className="bg-bg-primary/50 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={position.icon} 
                alt={position.symbol} 
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-semibold text-text-primary">{position.symbol}</p>
                <p className="text-sm text-text-secondary">
                  {type === 'withdraw' ? 'Supply Position' : 'Borrow Position'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-secondary mb-1">
                  {type === 'withdraw' ? 'Supplied Balance' : 'Borrowed Balance'}
                </p>
                <p className="font-semibold text-text-primary">
                  {type === 'withdraw' 
                    ? `${position.supplyBalance.toFixed(6)} ${position.symbol}`
                    : `${position.borrowBalance.toFixed(6)} ${position.symbol}`
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">
                  {type === 'withdraw' ? 'Current Value' : 'Total Debt'}
                </p>
                <p className="font-semibold text-text-primary">
                  {formatCurrency(type === 'withdraw' ? position.supplyUSD : position.borrowUSD)}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          {transactionResult === null && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Amount to {type === 'withdraw' ? 'Withdraw' : 'Repay'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isProcessing}
                    className="w-full bg-bg-primary border border-border-color rounded-lg py-3 px-4 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cyan disabled:opacity-50"
                  />
                  <button
                    onClick={handleMax}
                    disabled={isProcessing}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-accent-cyan hover:text-accent-cyan-hover font-semibold disabled:opacity-50"
                  >
                    MAX
                  </button>
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-text-secondary">
                    USD Value: {formatCurrency(amountUSD)}
                  </span>
                  <span className="text-text-secondary">
                    Available: {maxAmount.toFixed(6)} {position.symbol}
                  </span>
                </div>
              </div>

              {/* APY Info */}
              {type === 'withdraw' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary text-sm">Supply APY</span>
                    <span className="text-green-400 font-semibold">{formatAPY(position.supplyApy)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-500/20">
                    <span className="text-text-secondary text-sm">Estimated Yearly Earnings</span>
                    <span className="text-green-400 font-semibold">
                      {formatCurrency(position.supplyUSD * (position.supplyApy / 100))}
                    </span>
                  </div>
                </div>
              )}

              {type === 'repay' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary text-sm">Borrow APR</span>
                    <span className="text-red-400 font-semibold">{formatAPY(position.borrowApy)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-red-500/20">
                    <span className="text-text-secondary text-sm">Estimated Yearly Interest</span>
                    <span className="text-red-400 font-semibold">
                      {formatCurrency(position.borrowUSD * (position.borrowApy / 100))}
                    </span>
                  </div>
                </div>
              )}

              {/* Approval Warning */}
              {needsApproval && type === 'repay' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ You need to approve {position.symbol} spending before repaying. This will require a separate transaction.
                  </p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-red-400 text-sm">❌ {error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing || amountNum <= 0 || amountNum > maxAmount}
                  className="w-full bg-gradient-to-r from-accent-cyan to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-accent-cyan/90 hover:to-blue-600/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Confirm ${type === 'withdraw' ? 'Withdraw' : 'Repay'}`
                  )}
                </button>

                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-full bg-bg-primary border border-border-color text-text-secondary py-4 rounded-xl font-semibold hover:bg-bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Success State */}
          {transactionResult?.status === 'confirmed' && (
            <>
              {/* Success Icon */}
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>

              {/* Success Message */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  {type === 'withdraw' ? 'Withdrawal Successful!' : 'Repayment Successful!'}
                </h3>
                <p className="text-text-secondary">
                  You have successfully {type === 'withdraw' ? 'withdrawn' : 'repaid'} {amount} {position.symbol}
                </p>
              </div>

              {/* Transaction Details */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-400 text-sm font-medium">Amount</span>
                  <span className="text-text-primary font-semibold">{amount} {position.symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-400 text-sm font-medium">USD Value</span>
                  <span className="text-text-primary font-semibold">{formatCurrency(amountUSD)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-400 text-sm font-medium">Status</span>
                  <span className="text-green-400 font-semibold">Confirmed</span>
                </div>
                {transactionResult?.hash && (
                  <div className="flex justify-between items-center pt-3 border-t border-green-500/20">
                    <span className="text-green-400 text-sm font-medium">Transaction</span>
                    <button
                      onClick={() => window.open(getExplorerUrl(transactionResult.hash), '_blank', 'noopener,noreferrer')}
                      className="flex items-center gap-2 text-accent-cyan hover:underline transition-all"
                    >
                      <span className="text-sm">
                        {transactionResult.hash.slice(0, 6)}...{transactionResult.hash.slice(-4)}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-accent-cyan to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-accent-cyan/90 hover:to-blue-600/90 transition-all shadow-lg"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}