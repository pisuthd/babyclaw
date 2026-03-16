import { useCallback } from 'react';
import { useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import cTokenAbi from '../contracts/abis/cToken.json';
import erc20Abi from '../contracts/abis/erc20.json';
import comptrollerAbi from '../contracts/abis/comptroller.json';
import { COMPTROLLER_ADDRESS, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../contracts/config.js';

/**
 * Hook for lending actions on CELO chain
 * Provides supply, withdraw, borrow, repay, and market management functions
 */
export function useLendingActions() {
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract();

  /**
   * Supply tokens to a market
   * @param symbol - Token symbol (e.g., 'CELO', 'BABY')
   * @param amount - Amount to supply (in human-readable format)
   */
  const supply = useCallback(
    async (symbol, amount) => {
      try {
        const marketAddress = CTOKEN_ADDRESSES[symbol];
        const tokenConfig = TOKEN_CONFIGS[symbol];

        if (!marketAddress) {
          throw new Error(`Market not found for ${symbol}`);
        }

        const isNative = symbol === 'CELO';
        const decimals = tokenConfig?.decimals || 18;
        const amountWei = parseUnits(amount, decimals);

        const txHash = await writeContractAsync({
          address: marketAddress,
          abi: isNative ? [{
            "inputs": [],
            "name": "mint",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "payable",
            "type": "function"
          }] : cTokenAbi,
          functionName: 'mint',
          args: isNative ? undefined : [amountWei],
          value: isNative ? amountWei : undefined,
        });

        return {
          hash: txHash,
          status: 'pending',
        };
      } catch (err) {
        return {
          hash: '0x0',
          status: 'failed',
          error: err.message || 'Supply failed',
        };
      }
    },
    [writeContractAsync]
  );

  /**
   * Withdraw tokens from a market
   * @param symbol - Token symbol (e.g., 'CELO', 'BABY')
   * @param amount - Amount to withdraw (in human-readable format)
   */
  const withdraw = useCallback(
    async (symbol, amount) => {
      try {
        const marketAddress = CTOKEN_ADDRESSES[symbol];
        const tokenConfig = TOKEN_CONFIGS[symbol];

        if (!marketAddress) {
          throw new Error(`Market not found for ${symbol}`);
        }

        const decimals = tokenConfig?.decimals || 18;
        const amountWei = parseUnits(amount, decimals);

        const txHash = await writeContractAsync({
          address: marketAddress,
          abi: cTokenAbi,
          functionName: 'redeemUnderlying',
          args: [amountWei],
        });

        return {
          hash: txHash,
          status: 'pending',
        };
      } catch (err) {
        return {
          hash: '0x0',
          status: 'failed',
          error: err.message || 'Withdraw failed',
        };
      }
    },
    [writeContractAsync]
  );

  /**
   * Borrow tokens from a market
   * @param symbol - Token symbol (e.g., 'CELO', 'BABY')
   * @param amount - Amount to borrow (in human-readable format)
   */
  const borrow = useCallback(
    async (symbol, amount) => {
      try {
        const marketAddress = CTOKEN_ADDRESSES[symbol];
        const tokenConfig = TOKEN_CONFIGS[symbol];

        if (!marketAddress) {
          throw new Error(`Market not found for ${symbol}`);
        }

        const decimals = tokenConfig?.decimals || 18;
        const amountWei = parseUnits(amount, decimals);

        const txHash = await writeContractAsync({
          address: marketAddress,
          abi: cTokenAbi,
          functionName: 'borrow',
          args: [amountWei],
        });

        return {
          hash: txHash,
          status: 'pending',
        };
      } catch (err) {
        return {
          hash: '0x0',
          status: 'failed',
          error: err.message || 'Borrow failed',
        };
      }
    },
    [writeContractAsync]
  );

  /**
   * Repay borrowed tokens
   * @param symbol - Token symbol (e.g., 'CELO', 'BABY')
   * @param amount - Amount to repay (in human-readable format)
   */
  const repay = useCallback(
    async (symbol, amount) => {
      try {
        const marketAddress = CTOKEN_ADDRESSES[symbol];
        const tokenConfig = TOKEN_CONFIGS[symbol];

        if (!marketAddress) {
          throw new Error(`Market not found for ${symbol}`);
        }

        const isNative = symbol === 'CELO';
        const decimals = tokenConfig?.decimals || 18;
        const amountWei = parseUnits(amount, decimals);

        const txHash = await writeContractAsync({
          address: marketAddress,
          abi: isNative ? [{
            "inputs": [],
            "name": "repayBorrow",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
          }] : cTokenAbi,
          functionName: 'repayBorrow',
          args: isNative ? undefined : [amountWei],
          value: isNative ? amountWei : undefined,
        });

        return {
          hash: txHash,
          status: 'pending',
        };
      } catch (err) {
        return {
          hash: '0x0',
          status: 'failed',
          error: err.message || 'Repay failed',
        };
      }
    },
    [writeContractAsync]
  );

  /**
   * Approve token spending for a market
   * @param symbol - Token symbol (e.g., 'CELO', 'BABY')
   * @param spender - Address to approve (usually the cToken contract)
   * @param amount - Amount to approve (in human-readable format)
   */
  const approve = useCallback(
    async (symbol, spender, amount) => {
      try {
        const tokenConfig = TOKEN_CONFIGS[symbol];

        if (!tokenConfig?.address || symbol === 'CELO') {
          throw new Error(`Token not found or is native token`);
        }

        const decimals = tokenConfig.decimals || 18;
        const amountWei = parseUnits(amount, decimals);

        const txHash = await writeContractAsync({
          address: tokenConfig.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amountWei],
        });

        return {
          hash: txHash,
          status: 'pending',
        };
      } catch (err) {
        return {
          hash: '0x0',
          status: 'failed',
          error: err.message || 'Approve failed',
        };
      }
    },
    [writeContractAsync]
  );

  /**
   * Enter a market (enable as collateral)
   * @param symbol - Token symbol (e.g., 'CELO', 'BABY')
   */
  const enterMarket = useCallback(
    async (symbol) => {
      try {
        const marketAddress = CTOKEN_ADDRESSES[symbol];

        if (!marketAddress) {
          throw new Error(`Market not found for ${symbol}`);
        }

        const txHash = await writeContractAsync({
          address: COMPTROLLER_ADDRESS,
          abi: comptrollerAbi,
          functionName: 'enterMarkets',
          args: [[marketAddress]],
        });

        return {
          hash: txHash,
          status: 'pending',
        };
      } catch (err) {
        return {
          hash: '0x0',
          status: 'failed',
          error: err.message || 'Enter market failed',
        };
      }
    },
    [writeContractAsync]
  );

  /**
   * Exit a market (disable as collateral)
   * @param symbol - Token symbol (e.g., 'CELO', 'BABY')
   */
  const exitMarket = useCallback(
    async (symbol) => {
      try {
        const marketAddress = CTOKEN_ADDRESSES[symbol];

        if (!marketAddress) {
          throw new Error(`Market not found for ${symbol}`);
        }

        const txHash = await writeContractAsync({
          address: COMPTROLLER_ADDRESS,
          abi: comptrollerAbi,
          functionName: 'exitMarket',
          args: [marketAddress],
        });

        return {
          hash: txHash,
          status: 'pending',
        };
      } catch (err) {
        return {
          hash: '0x0',
          status: 'failed',
          error: err.message || 'Exit market failed',
        };
      }
    },
    [writeContractAsync]
  );

  return {
    supply,
    withdraw,
    borrow,
    repay,
    approve,
    enterMarket,
    exitMarket,
    isPending,
    error,
    currentHash: hash,
  };
}

/**
 * Provides supply, withdraw, borrow, and repay for a specific market
 */
export function useMarketLendingActions(market) {
  const { supply, withdraw, borrow, repay, approve, enterMarket, exitMarket, isPending, error, currentHash } = useLendingActions();

  const supplyMarket = useCallback(
    async (amount) => {
      if (!market) {
        return {
          hash: '0x0',
          status: 'failed',
          error: 'Market not initialized',
        };
      }
      return supply(market.symbol, amount);
    },
    [market, supply]
  );

  const withdrawMarket = useCallback(
    async (amount) => {
      if (!market) {
        return {
          hash: '0x0',
          status: 'failed',
          error: 'Market not initialized',
        };
      }
      return withdraw(market.symbol, amount);
    },
    [market, withdraw]
  );

  const borrowMarket = useCallback(
    async (amount) => {
      if (!market) {
        return {
          hash: '0x0',
          status: 'failed',
          error: 'Market not initialized',
        };
      }
      return borrow(market.symbol, amount);
    },
    [market, borrow]
  );

  const repayMarket = useCallback(
    async (amount) => {
      if (!market) {
        return {
          hash: '0x0',
          status: 'failed',
          error: 'Market not initialized',
        };
      }
      return repay(market.symbol, amount);
    },
    [market, repay]
  );

  const approveMarket = useCallback(
    async (amount) => {
      if (!market) {
        return {
          hash: '0x0',
          status: 'failed',
          error: 'Market not initialized',
        };
      }
      return approve(market.symbol, market.address, amount);
    },
    [market, approve]
  );

  return {
    supply: supplyMarket,
    withdraw: withdrawMarket,
    borrow: borrowMarket,
    repay: repayMarket,
    approve: approveMarket,
    enterMarket: () => enterMarket(market?.symbol || ''),
    exitMarket: () => exitMarket(market?.symbol || ''),
    isPending,
    error,
    currentHash,
  };
}