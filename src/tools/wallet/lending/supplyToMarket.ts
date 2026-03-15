/**
 * Supply tokens to BabyClaw lending market
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { parseUnits, formatUnits } from 'viem'
import { celo } from 'viem/chains'
import { getWalletClient, getPublicClient } from '../clients.js'
import { CTOKEN_ABI, ERC20_ABI, COMPTROLLER_ABI, LENDING_CONFIG, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../config.js'

/**
 * Supply tokens to the BabyClaw lending market
 */
export const supplyToMarketTool = tool({
  name: 'supply_to_market',
  description: 'Supply tokens to the BabyClaw lending market on CELO chain. Tokens can be CELO, BABY, or USDT.',
  inputSchema: z.object({
    token_symbol: z.enum(['CELO', 'BABY', 'USDT']).describe('Token symbol to supply'),
    amount: z.string().describe('Amount to supply in token units (e.g., "100", "0.5")'),
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
      const amountWei = parseUnits(amount, decimals)

      // Check balance
      let balance: bigint
      if (tokenSymbol === 'CELO') {
        balance = await publicClient.getBalance({ address: walletAddress })
      } else {
        const tokenAddress = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.address
        if (!tokenAddress) {
          throw new Error(`Token ${tokenSymbol} address not found`)
        }
        balance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
          chain: celo,
        } as any) as bigint
      }

      if (balance < amountWei) {
        throw new Error(
          `Insufficient ${tokenSymbol} balance. Current: ${formatUnits(balance, decimals)} ${tokenSymbol}, Required: ${amount} ${tokenSymbol}`
        )
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
            args: [cTokenAddress, BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')],
            chain: celo,
          } as any)
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }
      }

      // Check if account is in the market, if not enter market
      const isInMarket = await publicClient.readContract({
        address: LENDING_CONFIG.COMPTROLLER,
        abi: COMPTROLLER_ABI,
        functionName: 'checkMembership',
        args: [cTokenAddress, walletAddress],
        chain: celo,
      } as any)

      if (!isInMarket) {
        const enterMarketHash = await walletClient.writeContract({
          address: LENDING_CONFIG.COMPTROLLER,
          abi: COMPTROLLER_ABI,
          functionName: 'enterMarkets',
          args: [[cTokenAddress]],
          chain: celo,
        } as any)
        await publicClient.waitForTransactionReceipt({ hash: enterMarketHash })
      }

      // Supply tokens to market using mint function on cToken
      let txHash: `0x${string}`
      if (tokenSymbol === 'CELO') {
        txHash = await walletClient.writeContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: 'mint',
          args: [amountWei],
          value: amountWei,
          chain: celo,
        } as any)
      } else {
        txHash = await walletClient.writeContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: 'mint',
          args: [amountWei],
          chain: celo,
        } as any)
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      return {
        status: 'success',
        message: `✅ Successfully supplied ${amount} ${tokenSymbol} to BabyClaw lending market`,
        transaction_hash: txHash,
        details: {
          token_symbol: tokenSymbol,
          ctoken_address: cTokenAddress,
          supply_amount: amount,
          network: 'CELO (Chain ID: 42220)',
          explorer_url: `https://celoscan.io/tx/${txHash}`,
        },
        recommendations: [
          'Wait for transaction confirmation before using your supplied tokens as collateral',
          'Check your account liquidity to see increased borrowing capacity',
          'Supplied tokens will start earning interest based on market supply rates',
          'Monitor the supply APY which may change based on market conditions',
        ],
      }
    } catch (error: any) {
      throw new Error(`Failed to supply to market: ${error.message}`)
    }
  },
})