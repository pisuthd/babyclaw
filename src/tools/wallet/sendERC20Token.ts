/**
 * Tool: Send ERC-20 tokens (BABY or USDT)
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { parseUnits, formatUnits, type Address } from 'viem'
import { celo } from 'viem/chains'
import { getWalletClient, getPublicClient, getAccount } from './clients.js'
import { ERC20_ABI, TOKEN_CONFIGS } from './config.js'
import { getTokenBalance } from './utils.js'

export const sendERC20TokenTool = tool({
  name: 'send_erc20_token',
  description: 'Send ERC-20 tokens (BABY or USDT) to another address',
  inputSchema: z.object({
    token_symbol: z
      .string()
      .describe('Token symbol to send (e.g., BABY, USDT)'),
    to_address: z.string().describe('Recipient address'),
    amount: z.string().describe('Amount to send'),
  }),
  callback: async (input) => {
    try {
      const { token_symbol, to_address, amount } = input

      // Validate token symbol
      const upperSymbol = token_symbol.toUpperCase()
      const tokenConfig = TOKEN_CONFIGS[upperSymbol as keyof typeof TOKEN_CONFIGS]
      
      if (!tokenConfig || upperSymbol === 'CELO') {
        throw new Error(
          `Unsupported token symbol: ${token_symbol}. Supported: BABY, USDT`
        )
      }

      // Validate address
      if (!to_address || !/^0x[a-fA-F0-9]{40}$/.test(to_address)) {
        throw new Error('Invalid recipient address format')
      }

      // Parse amount
      const amountWei = parseUnits(amount, tokenConfig.decimals)

      // Get clients and account
      const walletClient = getWalletClient()
      const publicClient = getPublicClient()
      const account = getAccount()

      // Get token balance
      const tokenBalance = await getTokenBalance(tokenConfig.address, account.address)

      // Check sufficient balance
      if (tokenBalance.balance < amountWei) {
        throw new Error(
          `Insufficient ${tokenConfig.symbol} balance. Available: ${formatUnits(
            tokenBalance.balance,
            tokenConfig.decimals
          )} ${tokenConfig.symbol}, Required: ${amount} ${tokenConfig.symbol}`
        )
      }

      // Send transaction
      const txHash = await walletClient.writeContract({
        address: tokenConfig.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to_address as Address, amountWei],
        chain: celo,
      } as any)

      // Get transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      })

      const explorerUrl = `https://celoscan.io/tx/${txHash}`

      return {
        status: 'success',
        message: `✅ ${tokenConfig.symbol} tokens sent successfully`,
        transaction_hash: txHash,
        details: {
          token_symbol: tokenConfig.symbol,
          to_address,
          amount,
          network: 'CELO',
          chain_id: 42220,
          explorer_url: explorerUrl,
          block_number: receipt.blockNumber ? Number(receipt.blockNumber).toString() : undefined,
          gas_used: receipt.gasUsed ? receipt.gasUsed.toString() : undefined,
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to send ERC-20 tokens: ${error.message}`)
    }
  },
})