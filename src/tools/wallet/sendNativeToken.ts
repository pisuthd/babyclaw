/**
 * Tool: Send native CELO tokens
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { parseUnits, formatUnits, type Address } from 'viem'
import { getPublicClient, getWalletClient, getAccount } from './clients.js'

export const sendNativeTokenTool = tool({
  name: 'send_native_token',
  description: 'Send native CELO tokens to another address',
  inputSchema: z.object({
    to_address: z.string().describe('Recipient address'),
    amount: z.string().describe('Amount to send in CELO'),
  }),
  callback: async (input) => {
    try {
      const { to_address, amount } = input

      // Validate address
      if (!to_address || !/^0x[a-fA-F0-9]{40}$/.test(to_address)) {
        throw new Error('Invalid recipient address format')
      }

      // Parse amount
      const amountWei = parseUnits(amount, 18)

      // Get clients and account
      const publicClient = getPublicClient()
      const walletClient = getWalletClient()
      const account = getAccount()

      // Get current balance
      const balance = await publicClient.getBalance({
        address: account.address,
      })

      // Check sufficient balance
      if (balance < amountWei) {
        throw new Error(
          `Insufficient CELO balance. Available: ${formatUnits(balance, 18)} CELO, Required: ${amount} CELO`
        )
      }

      // Send transaction
      const txHash = await walletClient.sendTransaction({
        to: to_address as Address,
        value: amountWei,
      } as any)

      // Get transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      })

      const explorerUrl = `https://celoscan.io/tx/${txHash}`

      return {
        status: 'success',
        message: '✅ CELO tokens sent successfully',
        transaction_hash: txHash,
        details: {
          to_address,
          amount,
          network: 'CELO',
          chain_id: 42220,
          native_currency: 'CELO',
          explorer_url: explorerUrl,
          block_number: receipt.blockNumber ? Number(receipt.blockNumber).toString() : undefined,
          gas_used: receipt.gasUsed ? receipt.gasUsed.toString() : undefined,
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to send CELO tokens: ${error.message}`)
    }
  },
})