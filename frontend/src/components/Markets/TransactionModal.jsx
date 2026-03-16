import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useLendingActions } from '../../hooks/useLendingActions';
import { useUserMarketData } from '../../hooks/useMarketContract';
import { useTokenAllowance } from '../../hooks/useTokenAllowance';
import { useMarketEntry } from '../../hooks/useMarketEntry';
import { CTOKEN_ADDRESSES, TOKEN_CONFIGS, TOKEN_ADDRESSES } from '../../contracts/config.js';

export function TransactionModal({ isOpen, onClose, type, amount, market }) {
  const [currentStep, setCurrentStep] = useState('preview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [transactionResult, setTransactionResult] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [needsMarketEntry, setNeedsMarketEntry] = useState(false);
  // const [approvalTxHash, setApprovalTxHash] = useState(undefined);
  // const [marketEntryTxHash, setMarketEntryTxHash] = useState(undefined);
  const [mainTxHash, setMainTxHash] = useState(undefined);
  
  const { address } = useAccount();
  const { supply, borrow, approve, enterMarket } = useLendingActions();
  const { data: userMarketData } = useUserMarketData(
    CTOKEN_ADDRESSES[market.symbol],
    address
  );

  // Get token allowance for ERC20 tokens
  const tokenAddress = TOKEN_ADDRESSES[market.symbol];
  const { allowance } = useTokenAllowance(
    tokenAddress,
    address,
    CTOKEN_ADDRESSES[market.symbol]
  );

  // Check if market is entered (collateral enabled)
  const { isEntered } = useMarketEntry(market.symbol, address);

  // Wait for main transaction receipt
  const { data: mainReceipt, isSuccess: isMainConfirmed } = useWaitForTransactionReceipt({
    hash: mainTxHash,
    query: {
      enabled: !!mainTxHash,
    },
  });

  // Handle main transaction confirmation
  useEffect(() => {
    if (isMainConfirmed && mainReceipt && mainTxHash) {
      console.log('Main transaction confirmed:', mainReceipt);
      setTransactionResult({
        hash: mainTxHash,
        status: 'confirmed'
      });
      setIsProcessing(false);
      setCurrentStep('success');
    }
  }, [isMainConfirmed, mainReceipt, mainTxHash]);

  // Check requirements when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('preview');
      setIsProcessing(false);
      setError(null);
      setTransactionResult(null);
      // setApprovalTxHash(undefined);
      // setMarketEntryTxHash(undefined);
      setMainTxHash(undefined);
      checkRequirements();
    }
  }, [isOpen, type, market.symbol, address]);

  const checkRequirements = async () => {
    if (!market.symbol || !address) return;

    try {
      const isNative = market.symbol === 'CELO';
      
      // Check if token approval is needed (for ERC20 tokens only)
      if (type === 'supply' && !isNative) {
        const tokenConfig = TOKEN_CONFIGS[market.symbol];
        const decimals = tokenConfig?.decimals || 18;
        const amountWei = BigInt(Math.floor(parseFloat(amount || '0') * Math.pow(10, decimals)));
        
        setNeedsApproval(allowance < amountWei);
      } else {
        setNeedsApproval(false);
      }

      // Check if market entry is needed (for supply collateral)
      if (type === 'supply') {
        setNeedsMarketEntry(!isEntered);
      } else {
        setNeedsMarketEntry(false);
      }
    } catch (error) {
      console.error('Error checking requirements:', error);
      setNeedsApproval(false);
      setNeedsMarketEntry(false);
    }
  };

  const handlePreviewAction = async () => {
    setIsProcessing(true);
    setError(null);
    setCurrentStep('confirmation');

    try {
      // Handle approvals and market entry if needed (before main transaction)
      if (type === 'supply') {
        const isNative = market.symbol === 'CELO';
        
        // Approve ERC20 token if needed
        if (needsApproval && !isNative) {
          const approvalResult = await approve(market.symbol, CTOKEN_ADDRESSES[market.symbol], amount);
          if (approvalResult.status === 'failed') {
            throw new Error(approvalResult.error || 'Approval failed');
          }
          // if (approvalResult.hash) {
          //   setApprovalTxHash(approvalResult.hash);
          //   console.log('Approval transaction sent, hash:', approvalResult.hash);
          // }
        }

        // Enter market (enable as collateral) if needed
        if (needsMarketEntry) {
          const entryResult = await enterMarket(market.symbol);
          if (entryResult.status === 'failed') {
            throw new Error(entryResult.error || 'Market entry failed');
          }
          // if (entryResult.hash) {
          //   setMarketEntryTxHash(entryResult.hash);
          //   console.log('Market entry transaction sent, hash:', entryResult.hash);
          // }
        }
      }

      // Execute main transaction (supply or borrow)
      const result = type === 'supply'
        ? await supply(market.symbol, amount)
        : await borrow(market.symbol, amount);

      if (result.hash) {
        setMainTxHash(result.hash);
        console.log('Main transaction sent, hash:', result.hash);
        // Keep isProcessing true until confirmation (handled by useEffect)
      } else if (result.status === 'failed') {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err.message || 'Transaction failed');
      setIsProcessing(false);
      setCurrentStep('confirmation');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const formatUSD = (value) => {
    if (value === 0) return '$0.00';
    if (value < 0.01) return `$${value.toFixed(4)}`;
    if (value < 1) return `$${value.toFixed(2)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${(value / 1000000).toFixed(2)}M`;
  };

  // const formatPercent = (value) => {
  //   return `${value >= 0 ? '+' : ''}${parseFloat(value).toFixed(2)}%`;
  // };

  const formatAPY = (apy) => {
    if (apy === null || apy === undefined) return '0.00%';
    return `${parseFloat(apy).toFixed(2)}%`;
  };

  const getExplorerUrl = (txHash) => {
    return `https://celoscan.io/tx/${txHash}`;
  };

  if (!isOpen) return null;

  const amountNum = parseFloat(amount || '0');
  const amountUSD = amountNum * (market.price || 1);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-color rounded-2xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-color">
          <h2 className="text-2xl font-bold text-text-primary">
            {type === 'supply' ? 'Supply' : 'Borrow'} {market.symbol}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'preview' && (
            <>
              {/* Preview Section */}
              <div className="bg-bg-primary/50 rounded-xl p-5 mb-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">Asset</span>
                  <span className="text-text-primary font-semibold">{market.symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">Amount</span>
                  <span className="text-text-primary font-semibold">{amount} {market.symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">USD Value</span>
                  <span className="text-text-primary font-semibold">{formatUSD(amountUSD)}</span>
                </div>
                {type === 'supply' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary text-sm">Supply APY</span>
                      <span className="text-accent-cyan font-semibold">{formatAPY(market.supplyApy)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border-color">
                      <span className="text-text-secondary text-sm">Expected Yearly Earnings</span>
                      <span className="text-green-400 font-semibold">{formatUSD(amountUSD * (parseFloat(market.supplyApy) / 100))}</span>
                    </div>
                  </>
                )}
                {type === 'borrow' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary text-sm">Borrow APR</span>
                      <span className="text-accent-cyan font-semibold">{formatAPY(market.borrowApy)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border-color">
                      <span className="text-text-secondary text-sm">Estimated Yearly Interest</span>
                      <span className="text-red-400 font-semibold">{formatUSD(amountUSD * (parseFloat(market.borrowApy) / 100))}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Warnings */}
              {needsApproval && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ You need to approve {market.symbol} spending before supplying. This will require a separate transaction.
                  </p>
                </div>
              )}

              {needsMarketEntry && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <p className="text-blue-400 text-sm">
                    ⚠️ This asset will be enabled as collateral, allowing you to borrow against it. You can disable this later if needed.
                  </p>
                </div>
              )}

              {type === 'borrow' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Borrowing increases your debt. If your health factor drops too low, your position may be liquidated.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <button
                onClick={handlePreviewAction}
                disabled={isProcessing || amountNum <= 0}
                className="w-full bg-gradient-to-r from-accent-cyan to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-accent-cyan/90 hover:to-blue-600/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mb-3"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Confirm ${type === 'supply' ? 'Supply' : 'Borrow'}`
                )}
              </button>

              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="w-full bg-bg-primary border border-border-color text-text-secondary py-4 rounded-xl font-semibold hover:bg-bg-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </>
          )}

          {currentStep === 'confirmation' && (
            <>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-red-400 text-sm">❌ {error}</p>
                </div>
              )}

              {!error && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-primary font-semibold">Processing transaction...</p>
                  <p className="text-text-secondary text-sm mt-2">
                    {type === 'supply' && (needsApproval || needsMarketEntry) && (
                      <span className="block mt-2">
                        {needsApproval && 'Approving token → '}
                        {needsMarketEntry && 'Enabling collateral → '}
                        Supplying...
                      </span>
                    )}
                    {type === 'borrow' && 'Borrowing...'}
                  </p>
                </div>
              )}

              {!isProcessing && error && (
                <button
                  onClick={() => setCurrentStep('preview')}
                  className="w-full bg-accent-cyan text-white py-4 rounded-xl font-semibold hover:bg-accent-cyan/90 transition-all mb-3"
                >
                  Try Again
                </button>
              )}
            </>
          )}

          {currentStep === 'success' && (
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
                  {type === 'supply' ? 'Supply Successful!' : 'Borrow Successful!'}
                </h3>
                <p className="text-text-secondary">
                  You have successfully {type === 'supply' ? 'supplied' : 'borrowed'} {amount} {market.symbol}
                  {type === 'supply' && `. You're now earning ${formatAPY(market.supplyApy)} APY!`}
                </p>
              </div>

              {/* Transaction Details */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-400 text-sm font-medium">Amount</span>
                  <span className="text-text-primary font-semibold">{amount} {market.symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-400 text-sm font-medium">USD Value</span>
                  <span className="text-text-primary font-semibold">{formatUSD(amountUSD)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-400 text-sm font-medium">{type === 'supply' ? 'Supply APY' : 'Borrow APR'}</span>
                  <span className="text-text-primary font-semibold">{formatAPY(type === 'supply' ? market.supplyApy : market.borrowApy)}</span>
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
                onClick={handleClose}
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