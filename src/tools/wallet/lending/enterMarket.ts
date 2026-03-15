/**
 * Enter BabyClaw lending markets to enable collateral usage
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { celo } from 'viem/chains'
import { getWalletClient, getPublicClient } from '../clients.js'
import { COMPTROLLER_ABI, LENDING_CONFIG, CTOKEN_ADDRESSES } from '../config.js'

/**
 * Enter BabyClaw markets to enable collateral usage
 */
export const enterMarketTool = tool({
  name: 'enter_market',
  description: 'Enter BabyClaw lending markets to enable collateral usage on CELO chain. Tokens can be CELO, BABY, or USDT.',
  inputSchema: z.object({
    token_symbols: z.array(z.enum(['CELO', 'BABY', 'USDT'])).describe('Array of token symbols to enter markets for (e.g., ["CELO", "BABY", "USDT"])'),
    check_membership: z.boolean().optional().default(true).describe('Check current market membership before entering (default: true)'),
  }),
  callback: async (input) => {
    try {
      const tokenSymbols = input.token_symbols.map((sym) => sym.toUpperCase())
      const checkMembership = input.check_membership !== false

      const walletClient = getWalletClient()
      const publicClient = getPublicClient()
      const walletAddress = walletClient.account.address

      const cTokenAddresses: `0x${string}`[] = []
      const membershipStatus: any[] = []
      const unavailableTokens: string[] = []

      for (const tokenSymbol of tokenSymbols) {
        const cTokenAddress = CTOKEN_ADDRESSES[tokenSymbol as keyof typeof CTOKEN_ADDRESSES]

        if (!cTokenAddress) {
          unavailableTokens.push(tokenSymbol)
          continue
        }

        // Check current membership if requested
        if (checkMembership) {
          try {
            const isMember = await publicClient.readContract({
              address: LENDING_CONFIG.COMPTROLLER,
              abi: COMPTROLLER_ABI,
              functionName: 'checkMembership',
              args: [cTokenAddress, walletAddress],
              chain: celo,
            } as any)

            membershipStatus.push({
              token_symbol: tokenSymbol,
              ctoken_address: cTokenAddress,
              is_member: isMember,
            })

            // Only add to list if not already a member
            if (!isMember) {
              cTokenAddresses.push(cTokenAddress)
            }
          } catch (error) {
            // If membership check fails, include the token for entry
            membershipStatus.push({
              token_symbol: tokenSymbol,
              ctoken_address: cTokenAddress,
              is_member: false,
              error: 'Membership check failed',
            })
            cTokenAddresses.push(cTokenAddress)
          }
        } else {
          cTokenAddresses.push(cTokenAddress)
        }
      }

      // Handle unavailable tokens
      if (unavailableTokens.length > 0) {
        const availableTokens = Object.keys(CTOKEN_ADDRESSES).join(', ')
        throw new Error(
          `Markets not available on current network: ${unavailableTokens.join(', ')}. Available tokens: ${availableTokens}`
        )
      }

      if (cTokenAddresses.length === 0) {
        return {
          status: 'success',
          message: '✅ All requested markets already entered',
          details: {
            membership_status: membershipStatus,
            network: {
              name: 'CELO',
              chain_id: 42220,
              native_currency: 'CELO',
            },
          },
          recommendations: [
            'All tokens are already enabled as collateral',
            'You can now use these tokens for borrowing',
            'Consider checking your account liquidity',
          ],
        }
      }

      // Enter markets
      const txHash = await walletClient.writeContract({
        address: LENDING_CONFIG.COMPTROLLER,
        abi: COMPTROLLER_ABI,
        functionName: 'enterMarkets',
        args: [cTokenAddresses],
        chain: celo,
      } as any)

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      return {
        status: 'success',
        message: `✅ Successfully entered ${cTokenAddresses.length} markets`,
        transaction_hash: txHash,
        details: {
          markets_entered: cTokenAddresses.map((addr) => {
            const memberStatus = membershipStatus.find((s) => s.ctoken_address === addr)
            return {
              token_symbol: memberStatus?.token_symbol || 'Unknown',
              ctoken_address: addr,
            }
          }),
          membership_status: membershipStatus,
          network: {
            name: 'CELO',
            chain_id: 42220,
            native_currency: 'CELO',
          },
          explorer_url: `https://celoscan.io/tx/${txHash}`,
        },
        recommendations: [
          'Wait for transaction confirmation',
          'Markets will be enabled as collateral after confirmation',
          'You can now borrow against these tokens',
          'Check account liquidity after entering markets',
          'Monitor your health factor when borrowing',
        ],
      }
    } catch (error: any) {
      throw new Error(`Failed to enter markets: ${error.message}`)
    }
  },
})