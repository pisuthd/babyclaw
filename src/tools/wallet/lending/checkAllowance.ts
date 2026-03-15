/**
 * Check token allowance for BabyClaw lending operations
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { formatUnits } from 'viem'
import { celo } from 'viem/chains'
import { getPublicClient } from '../clients.js'
import { ERC20_ABI, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../config.js'

/**
 * Check token allowance for a spender address
 */
export const checkAllowanceTool = tool({
  name: 'check_allowance',
  description: 'Check token allowance for BabyClaw lending operations on CELO chain. Tokens can be CELO, BABY, or USDT.',
  inputSchema: z.object({
    token_symbol: z.enum(['CELO', 'BABY', 'USDT']).describe('Token symbol to check allowance for'),
    spender_address: z.string().optional().describe('Spender address to check allowance for (optional, defaults to cToken address for the token)'),
    owner_address: z.string().optional().describe('Owner address to check allowance for (optional, defaults to wallet address)'),
  }),
  callback: async (input) => {
    try {
      const tokenSymbol = input.token_symbol

      const publicClient = getPublicClient()

      // Default spender address - use cToken address if not provided
      let spenderAddress = input.spender_address
      if (!spenderAddress) {
        const cTokenAddress = CTOKEN_ADDRESSES[tokenSymbol as keyof typeof CTOKEN_ADDRESSES]
        if (!cTokenAddress) {
          throw new Error(`Token ${tokenSymbol} not supported. Supported tokens: CELO, BABY, USDT`)
        }
        spenderAddress = cTokenAddress
      }

      // Default owner address - use wallet address if not provided
      const ownerAddress = input.owner_address

      // CELO is native, no approval needed
      if (tokenSymbol === 'CELO') {
        return {
          status: 'success',
          message: 'ℹ️ CELO is a native token and does not require approval',
          details: {
            token_symbol: tokenSymbol,
            note: 'Native tokens do not require approval for spending',
            owner_address: ownerAddress,
            spender_address: spenderAddress,
          },
          recommendations: [
            'You can directly use CELO in transactions without approval',
            'For ERC20 tokens (BABY, USDT), approval is required before supplying',
          ],
        }
      }

      // Get token address
      const tokenAddress = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.address
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} address not found`)
      }

      // Check allowance
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
        chain: celo,
      } as any) as bigint

      const decimals = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.decimals ?? 18
      const allowanceFormatted = formatUnits(allowance, decimals)
      const isUnlimited = allowance === BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')

      // Get token balance for context
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [ownerAddress as `0x${string}`],
        chain: celo,
      } as any) as bigint

      const balanceFormatted = formatUnits(balance, decimals)
      const isSufficient = allowance >= balance || isUnlimited

      return {
        status: 'success',
        message: '✅ Token allowance checked successfully',
        details: {
          token_symbol: tokenSymbol,
          token_address: tokenAddress,
          owner_address: ownerAddress,
          spender_address: spenderAddress,
          allowance: allowanceFormatted,
          allowance_raw: allowance.toString(),
          is_unlimited: isUnlimited,
          is_sufficient: isSufficient,
          owner_balance: balanceFormatted,
          allowance_type: isUnlimited ? 'Unlimited' : 'Limited',
          network: 'CELO (Chain ID: 42220)',
        },
        analysis: {
          can_spend_full_balance: isSufficient,
          needs_approval: !isSufficient,
          recommendation: isSufficient
            ? `✅ Allowance is sufficient. You can spend your full balance.`
            : `⚠️ Allowance is insufficient. Current allowance: ${allowanceFormatted} ${tokenSymbol}, Balance: ${balanceFormatted} ${tokenSymbol}`,
        },
        recommendations: isSufficient
          ? [
              'Your current allowance is sufficient to spend all your tokens',
              'You can proceed with lending operations without additional approval',
              'Consider revoking and re-approving if you want to set a specific limit',
            ]
          : [
              `Current allowance (${allowanceFormatted} ${tokenSymbol}) is less than your balance (${balanceFormatted} ${tokenSymbol})`,
              'Use approve_token tool to increase allowance before lending operations',
              'Consider approving max uint256 for unlimited spending',
              'Alternatively, approve a specific amount for controlled spending',
            ],
      }
    } catch (error: any) {
      throw new Error(`Failed to check allowance: ${error.message}`)
    }
  },
})