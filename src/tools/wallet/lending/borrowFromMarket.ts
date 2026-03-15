/**
 * Borrow tokens from BabyClaw lending market
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { parseUnits, formatUnits } from 'viem'
import { celo } from 'viem/chains'
import { getWalletClient, getPublicClient } from '../clients.js'
import { CTOKEN_ABI, COMPTROLLER_ABI, LENDING_CONFIG, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../config.js'

/**
 * Borrow tokens from the BabyClaw lending market
 */
export const borrowFromMarketTool = tool({
  name: 'borrow_from_market',
  description: 'Borrow tokens from the BabyClaw lending market on CELO chain. Tokens can be CELO, BABY, or USDT.',
  inputSchema: z.object({
    token_symbol: z.enum(['CELO', 'BABY', 'USDT']).describe('Token symbol to borrow'),
    amount: z.string().describe('Amount to borrow in token units (e.g., "100", "0.5")'),
  }),
  callback: async (input) => {
    try {
      const tokenSymbol = input.token_symbol
      const amount = input.amount

      const walletClient = getWalletClient()
      const publicClient = getPublicClient()
      const walletAddress = walletClient.account.address

      // Get cToken address
      const cTokenAddress = CTOKEN_ADDRESSES[tokenSymbol as keyof typeof CTOKEN_ADDRESSES]
      if (!cTokenAddress) {
        throw new Error(`Token ${tokenSymbol} not supported. Supported tokens: CELO, BABY, USDT`)
      }

      // Get token decimals
      const decimals = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.decimals ?? 18
      const amountWei = parseUnits(amount, decimals)

      // Check account liquidity
      const [error, liquidity, shortfall] = await publicClient.readContract({
        address: LENDING_CONFIG.COMPTROLLER,
        abi: COMPTROLLER_ABI,
        functionName: 'getAccountLiquidity',
        args: [walletAddress],
        chain: celo,
      } as any) as [bigint, bigint, bigint]

      if (error !== 0n) {
        throw new Error(`Account error: ${error}. Please check your account status.`)
      }

      if (shortfall > 0n) {
        throw new Error(
          `Account has shortfall: ${formatUnits(shortfall, decimals)}. You are at risk of liquidation. Please repay some debt first.`
        )
      }

      if (liquidity < amountWei) {
        throw new Error(
          `Insufficient liquidity. Current: ${formatUnits(liquidity, decimals)}, Required: ${amount} ${tokenSymbol}. Supply more collateral to increase borrowing capacity.`
        )
      }

      // Check if account is in the market
      const isInMarket = await publicClient.readContract({
        address: LENDING_CONFIG.COMPTROLLER,
        abi: COMPTROLLER_ABI,
        functionName: 'checkMembership',
        args: [cTokenAddress, walletAddress],
        chain: celo,
      } as any)

      if (!isInMarket) {
        throw new Error(
          `Account not in ${tokenSymbol} market. Please supply some ${tokenSymbol} as collateral first.`
        )
      }

      // Borrow tokens from market
      const txHash = await walletClient.writeContract({
        address: cTokenAddress,
        abi: CTOKEN_ABI,
        functionName: 'borrow',
        args: [amountWei],
        chain: celo,
      } as any)

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      return {
        status: 'success',
        message: `✅ Successfully borrowed ${amount} ${tokenSymbol} from BabyClaw lending market`,
        transaction_hash: txHash,
        details: {
          token_symbol: tokenSymbol,
          ctoken_address: cTokenAddress,
          borrow_amount: amount,
          network: 'CELO (Chain ID: 42220)',
          explorer_url: `https://celoscan.io/tx/${txHash}`,
        },
        recommendations: [
          'Wait for transaction confirmation before using the borrowed tokens',
          'Monitor your account health factor regularly to avoid liquidation',
          'Borrowed tokens will accrue interest based on market borrow rates',
          'Consider maintaining a health factor above 1.5 for safety margin',
          'Repay your loans promptly to minimize interest costs',
        ],
      }
    } catch (error: any) {
      throw new Error(`Failed to borrow from market: ${error.message}`)
    }
  },
})