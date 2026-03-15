/**
 * Approve token for BabyClaw lending operations
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { maxUint256 } from 'viem'
import { celo } from 'viem/chains'
import { getWalletClient, getPublicClient } from '../clients.js'
import { ERC20_ABI, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../config.js'

/**
 * Approve token for BabyClaw lending operations
 */
export const approveTokenTool = tool({
  name: 'approve_token',
  description: 'Approve token for BabyClaw lending operations on CELO chain. Tokens can be CELO, BABY, or USDT.',
  inputSchema: z.object({
    token_symbol: z.enum(['CELO', 'BABY', 'USDT']).describe('Token symbol to approve'),
    amount: z.string().optional().describe('Amount to approve (optional, defaults to max uint256)'),
    spender_address: z.string().optional().describe('Spender address to approve for (optional, defaults to cToken address for the token)'),
  }),
  callback: async (input) => {
    try {
      const tokenSymbol = input.token_symbol

      const walletClient = getWalletClient()
      const publicClient = getPublicClient()
      const walletAddress = walletClient.account.address

      // Default spender address - use cToken address if not provided
      let spenderAddress = input.spender_address
      if (!spenderAddress) {
        const cTokenAddress = CTOKEN_ADDRESSES[tokenSymbol as keyof typeof CTOKEN_ADDRESSES]
        if (!cTokenAddress) {
          throw new Error(`Token ${tokenSymbol} not supported. Supported tokens: CELO, BABY, USDT`)
        }
        spenderAddress = cTokenAddress
      }

      // CELO is native, no approval needed
      if (tokenSymbol === 'CELO') {
        return {
          status: 'success',
          message: 'ℹ️ CELO is a native token and does not require approval',
          details: {
            token_symbol: tokenSymbol,
            note: 'Native tokens do not require approval for spending',
          },
          recommendations: [
            'You can directly use CELO in transactions without approval',
            'For ERC20 tokens (BABY, USDT), use this approve tool before supplying',
          ],
        }
      }

      // Get token address
      const tokenAddress = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.address
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} address not found`)
      }

      // Parse amount or use max uint256
      let amountWei: bigint
      if (!input.amount) {
        amountWei = maxUint256
      } else {
        const decimals = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.decimals ?? 18
        amountWei = BigInt(input.amount) * BigInt(10 ** decimals)
      }

      // Approve token
      const txHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, amountWei],
        chain: celo,
      } as any)

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      // Verify approval
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletAddress, spenderAddress as `0x${string}`],
        chain: celo,
      } as any)

      return {
        status: 'success',
        message: '✅ Token approved successfully',
        transaction_hash: txHash,
        details: {
          token_symbol: tokenSymbol,
          token_address: tokenAddress,
          spender_address: spenderAddress,
          amount_approved: input.amount || 'max uint256 (unlimited)',
          current_allowance: allowance.toString(),
          network: 'CELO (Chain ID: 42220)',
          explorer_url: `https://celoscan.io/tx/${txHash}`,
        },
        recommendations: [
          'Save the transaction hash for reference',
          'Wait for transaction confirmation',
          'You can now use the token in BabyClaw lending operations',
          'The approval is unlimited (max uint256) unless a specific amount was specified',
          'Check token allowance if needed using check_allowance tool',
        ],
      }
    } catch (error: any) {
      throw new Error(`Failed to approve token: ${error.message}`)
    }
  },
})