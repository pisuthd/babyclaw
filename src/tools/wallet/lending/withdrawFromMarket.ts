/**
 * Withdraw supplied tokens from BabyClaw lending market
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { parseUnits, formatUnits } from 'viem'
import { celo } from 'viem/chains'
import { getWalletClient, getPublicClient } from '../clients.js'
import { CTOKEN_ABI, COMPTROLLER_ABI, LENDING_CONFIG, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../config.js'

/**
 * Withdraw supplied tokens from the BabyClaw lending market
 */
export const withdrawFromMarketTool = tool({
  name: 'withdraw_from_market',
  description: 'Withdraw supplied tokens from the BabyClaw lending market on CELO chain. Tokens can be CELO, BABY, or USDT.',
  inputSchema: z.object({
    token_symbol: z.enum(['CELO', 'BABY', 'USDT']).describe('Token symbol to withdraw'),
    amount: z.string().describe('Amount of underlying tokens to withdraw in token units (e.g., "100", "0.5")'),
    check_liquidity: z.boolean().optional().default(true).describe('Check if withdrawal maintains healthy account (default: true)'),
  }),
  callback: async (input) => {
    try {
      const tokenSymbol = input.token_symbol
      const amount = input.amount
      const checkLiquidity = input.check_liquidity !== false

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

      // Get cToken balance and decimals
      const cTokenBalance = await publicClient.readContract({
        address: cTokenAddress,
        abi: CTOKEN_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
        chain: celo,
      } as any) as bigint

      const cTokenDecimals = await publicClient.readContract({
        address: cTokenAddress,
        abi: CTOKEN_ABI,
        functionName: 'decimals',
        args: [],
        chain: celo,
      } as any) as number

      if (cTokenBalance === 0n) {
        throw new Error(`No supplied ${tokenSymbol} in the market`)
      }

      // Get exchange rate to calculate max withdrawable
      const exchangeRateStored = await publicClient.readContract({
        address: cTokenAddress,
        abi: CTOKEN_ABI,
        functionName: 'exchangeRateStored',
        args: [],
        chain: celo,
      } as any) as bigint

      // Calculate max withdrawable using proper decimal handling
      // Formula: (cTokenBalance * exchangeRate) / (10^(18 + underlyingDecimals - cTokenDecimals))
      const cTokenDecimalsBig = 10n ** BigInt(cTokenDecimals)
      const underlyingDecimalsBig = 10n ** BigInt(decimals)
      const exchangeRateBase = 10n ** 18n
      
      // Max underlying = (cTokenBalance * exchangeRate) / (10^18) * (10^cTokenDecimals / 10^underlyingDecimals)
      // Break down into steps for clarity and type safety
      const product = cTokenBalance * exchangeRateStored
      const scaledByExchangeRate = product / exchangeRateBase
      const scaledByCTokenDecimals = scaledByExchangeRate * cTokenDecimalsBig
      const maxUnderlyingWei = scaledByCTokenDecimals / underlyingDecimalsBig
      const maxWithdrawableFormatted = formatUnits(maxUnderlyingWei, decimals)
      const maxWithdrawableWei = parseUnits(maxWithdrawableFormatted, decimals)
      const requestedAmountWei = amountWei
      const requestedAmountNumber = Number(amount)

      // Compare as numbers to avoid precision issues
      if (Number(maxWithdrawableFormatted) < requestedAmountNumber) {
        throw new Error(
          `Insufficient supplied tokens. Maximum withdrawable: ${Number(maxWithdrawableFormatted).toFixed(6)} ${tokenSymbol}, Requested: ${amount} ${tokenSymbol}`
        )
      }

      // Check liquidity if requested
      if (checkLiquidity) {
        const [error, currentLiquidity, currentShortfall] = await publicClient.readContract({
          address: LENDING_CONFIG.COMPTROLLER,
          abi: COMPTROLLER_ABI,
          functionName: 'getAccountLiquidity',
          args: [walletAddress],
          chain: celo,
        } as any) as [bigint, bigint, bigint]

        if (currentShortfall > 0n) {
          throw new Error(
            `Account already has shortfall: ${formatUnits(currentShortfall, decimals)}. Withdrawal would worsen the situation. Please repay some debt first.`
          )
        }

        if (currentLiquidity < amountWei) {
          const collateralFactor = 0.8 // Assume 80% collateral factor
          const safeLiquidity = Number(currentLiquidity) * collateralFactor
          if (safeLiquidity < amountWei) {
            throw new Error(
              `Withdrawal would put account at risk of liquidation. Current liquidity: ${formatUnits(currentLiquidity, decimals)}, Requested: ${amount} ${tokenSymbol}. Consider withdrawing less.`
            )
          }
        }
      }

      // Withdraw underlying tokens
      const txHash = await walletClient.writeContract({
        address: cTokenAddress,
        abi: CTOKEN_ABI,
        functionName: 'redeemUnderlying',
        args: [amountWei],
        chain: celo,
      } as any)

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      return {
        status: 'success',
        message: `✅ Successfully withdrew ${amount} ${tokenSymbol} from BabyClaw lending market`,
        transaction_hash: txHash,
        details: {
          token_symbol: tokenSymbol,
          ctoken_symbol: `c${tokenSymbol}`,
          ctoken_address: cTokenAddress,
          withdraw_amount: amount,
          network: 'CELO (Chain ID: 42220)',
          explorer_url: `https://celoscan.io/tx/${txHash}`,
        },
        recommendations: [
          'Wait for transaction confirmation before using the withdrawn tokens',
          'Check your wallet balance for the withdrawn tokens',
          'Note: The system burned the required cTokens based on current exchange rate',
          'Exchange rates fluctuate based on market conditions',
          'Monitor your account liquidity after withdrawal if you have active loans',
          'Consider the tax implications if applicable in your jurisdiction',
        ],
      }
    } catch (error: any) {
      throw new Error(`Failed to withdraw from market: ${error.message}`)
    }
  },
})