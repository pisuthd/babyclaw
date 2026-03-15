/**
 * Repay borrowed tokens to BabyClaw lending market
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { celo } from 'viem/chains'
import { getWalletClient, getPublicClient } from '../clients.js'
import { CTOKEN_ABI, ERC20_ABI, LENDING_CONFIG, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../config.js'

/**
 * Repay borrowed tokens to the BabyClaw lending market
 */
export const repayBorrowTool = tool({
  name: 'repay_borrow',
  description: 'Repay borrowed tokens to the BabyClaw lending market on CELO chain. Tokens can be CELO, BABY, or USDT.',
  inputSchema: z.object({
    token_symbol: z.enum(['CELO', 'BABY', 'USDT']).describe('Token symbol to repay'),
    amount: z.string().optional().describe('Amount to repay in token units (e.g., "100", "0.5"). If not specified, repays full debt'),
    auto_approve: z.boolean().optional().default(true).describe('Automatically approve token spending if needed (default: true)'),
  }),
  callback: async (input) => {
    try {
      const tokenSymbol = input.token_symbol
      const amount = input.amount
      const autoApprove = input.auto_approve !== false

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

      // Get current borrow balance
      const borrowBalance = await publicClient.readContract({
        address: cTokenAddress,
        abi: CTOKEN_ABI,
        functionName: 'borrowBalanceStored',
        args: [walletAddress],
        chain: celo,
      } as any) as bigint

      const borrowBalanceFormatted = formatUnits(borrowBalance, decimals)

      if (borrowBalance === 0n) {
        throw new Error(`No active borrow position for ${tokenSymbol}. Current borrow balance: ${borrowBalanceFormatted}`)
      }

      // Determine repayment amount
      let amountWei: bigint
      let repayAmountFormatted: string

      if (!amount) {
        // Repay full debt
        amountWei = borrowBalance
        repayAmountFormatted = borrowBalanceFormatted
      } else {
        amountWei = parseUnits(amount, decimals)
        repayAmountFormatted = amount

        if (amountWei > borrowBalance) {
          throw new Error(
            `Repayment amount exceeds borrow balance. Borrow balance: ${borrowBalanceFormatted} ${tokenSymbol}, Requested: ${amount} ${tokenSymbol}`
          )
        }
      }

      // Check and approve if ERC20 token
      if (tokenSymbol !== 'CELO' && autoApprove) {
        const tokenAddress = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.address
        if (!tokenAddress) {
          throw new Error(`Token ${tokenSymbol} address not found`)
        }

        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [walletAddress, cTokenAddress],
          chain: celo,
        } as any) as bigint

        if (allowance < amountWei) {
          const approveHash = await walletClient.writeContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [cTokenAddress, maxUint256],
            chain: celo,
          } as any)
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }
      }

      // Check balance
      if (tokenSymbol === 'CELO') {
        const balance = await publicClient.getBalance({ address: walletAddress })
        if (balance < amountWei) {
          throw new Error(
            `Insufficient CELO balance. Current: ${formatUnits(balance, decimals)} CELO, Required: ${repayAmountFormatted} CELO`
          )
        }
      } else {
        const tokenAddress = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.address
        if (!tokenAddress) {
          throw new Error(`Token ${tokenSymbol} address not found`)
        }

        const balance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
          chain: celo,
        } as any) as bigint

        if (balance < amountWei) {
          throw new Error(
            `Insufficient ${tokenSymbol} balance. Current: ${formatUnits(balance, decimals)} ${tokenSymbol}, Required: ${repayAmountFormatted} ${tokenSymbol}`
          )
        }
      }

      // Repay borrowed tokens
      let txHash: `0x${string}`
      if (tokenSymbol === 'CELO') {
        txHash = await walletClient.writeContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: 'repayBorrow',
          args: [amountWei],
          value: amountWei,
          chain: celo,
        } as any)
      } else {
        txHash = await walletClient.writeContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: 'repayBorrow',
          args: [amountWei],
          chain: celo,
        } as any)
      }

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      return {
        status: 'success',
        message: `✅ Successfully repaid ${repayAmountFormatted} ${tokenSymbol} to BabyClaw lending market`,
        transaction_hash: txHash,
        details: {
          token_symbol: tokenSymbol,
          ctoken_address: cTokenAddress,
          repayment_amount: repayAmountFormatted,
          previous_borrow_balance: borrowBalanceFormatted,
          network: 'CELO (Chain ID: 42220)',
          explorer_url: `https://celoscan.io/tx/${txHash}`,
        },
        recommendations: [
          'Wait for transaction confirmation to verify repayment completion',
          'Check your account liquidity after repayment to see improved health factor',
          'Full repayment eliminates interest accumulation on the repaid amount',
          'Partial repayments reduce interest costs while maintaining borrowing capacity',
          'Monitor your overall portfolio after repayment for optimal position management',
        ],
      }
    } catch (error: any) {
      throw new Error(`Failed to repay borrow: ${error.message}`)
    }
  },
})