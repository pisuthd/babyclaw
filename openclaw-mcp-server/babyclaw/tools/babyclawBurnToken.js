'use strict'

import { z } from 'zod'
import { ethers } from 'ethers'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { parseAmountToBaseUnits, formatAmountFromBaseUnits, createReadContract } from './utils.js'
import { BABY_TOKEN_ABI, TOKEN_CONFIGS, TOKEN_ADDRESSES } from './config.js'

/**
 * Registers 'babyclawBurnToken' tool for burning BABY tokens.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawBurnToken (server) {
  server.registerTool(
    'babyclawBurnToken',
    {
      title: 'Burn BABY Tokens',
      description: `Burn BABY tokens from the wallet. Requires AI Agent or Creator role on the BabyToken contract.

This tool burns BABY tokens, reducing the total supply. Only addresses with AI_AGENT_BURNER_ROLE or CREATOR_ROLE can burn tokens. This is a WRITE operation that modifies the blockchain and costs gas fees.

Args:
  - amount (REQUIRED): Amount of BABY tokens to burn in human-readable format (e.g., "100", "0.5")

Returns:
  Text format: Transaction confirmation with details
  
  Structured output:
  {
    "status": "success",
    "amount": "100",
    "token": "BABY",
    "burnRole": "AI Agent",
    "previousBalance": "1000",
    "newBalance": "900",
    "transactionHash": "0x..."
  }
  
Examples:
  - Use when: "Burn 100 BABY tokens"
  - Use when: "Reduce my BABY token holdings by 50 tokens"
  - Use when: "Execute a burn operation on the token"
  - Don't use when: You don't have AI Agent or Creator role
  - Don't use when: You want to transfer tokens (use transfer instead)

Error Handling:
  - Returns error if caller does not have burn permission
  - Returns error if insufficient token balance
  - Returns error if transaction fails`,
      inputSchema: z.object({
        amount: z.string()
          .min(1, 'Amount must be at least 1 character')
          .describe('Amount of BABY tokens to burn in human-readable format (e.g., "100", "0.5")')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the burn operation'),
        amount: z.string().describe('Amount of tokens burned'),
        token: z.string().describe('Token symbol'),
        burnRole: z.string().describe('Role used for burning (AI Agent or Creator)'),
        previousBalance: z.string().describe('Balance before burn'),
        newBalance: z.string().describe('Balance after burn'),
        transactionHash: z.string().describe('Transaction hash'),
        blockNumber: z.union([z.number(), z.null()]).describe('Block number'),
        gasUsed: z.string().describe('Gas used')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ amount }) => {
      try {
        const account = await server.wdk.getAccount('celo', 0)
        const walletAddress = await account.getAddress()
        const tokenConfig = TOKEN_CONFIGS.BABY
        const tokenAddress = TOKEN_ADDRESSES.BABY

        // Parse amount to base units
        const amountWei = parseAmountToBaseUnits(amount, tokenConfig.decimals)

        // Create read contract for BABY token
        const babyTokenRead = createReadContract(tokenAddress, BABY_TOKEN_ABI, account)

        // Check if caller has burn permissions
        const [isAIAgent, isCreator] = await Promise.all([
          babyTokenRead.isAIAgent(walletAddress),
          babyTokenRead.isCreator(walletAddress)
        ])

        if (!isAIAgent && !isCreator) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Error: Caller does not have burn permission. Requires AI Agent or Creator role.' }]
          }
        }

        // Get current balance
        const balance = await babyTokenRead.balanceOf(walletAddress)

        // Check sufficient balance
        if (balance < amountWei) {
          const balanceFormatted = formatAmountFromBaseUnits(balance, tokenConfig.decimals)
          return {
            isError: true,
            content: [{ type: 'text', text: `Error: Insufficient BABY token balance. Available: ${balanceFormatted}, Required: ${amount}` }]
          }
        }

        // Create interface for encoding function call data
        const iface = new ethers.Interface(BABY_TOKEN_ABI)
        
        // Send burn transaction
        const tx = await account.sendTransaction({
          to: tokenAddress,
          value: 0n,
          data: iface.encodeFunctionData('burn', [amountWei])
        })

        // Get new balance after transaction
        const newBalance = await babyTokenRead.balanceOf(walletAddress)

        const balanceFormatted = formatAmountFromBaseUnits(balance, tokenConfig.decimals)
        const newBalanceFormatted = formatAmountFromBaseUnits(newBalance, tokenConfig.decimals)

        const result = {
          status: 'success',
          message: `✅ Successfully burned ${amount} BABY tokens`,
          token: 'BABY',
          amount: amount,
          burnRole: isAIAgent ? 'AI Agent' : 'Creator',
          previousBalance: balanceFormatted,
          newBalance: newBalanceFormatted,
          transaction_hash: typeof tx === 'string' ? tx : (tx.hash || tx.toString()),
          token_address: tokenAddress
        }

        const contentText = `✅ Successfully burned ${amount} BABY tokens

Burn Details:
- Token: BABY
- Amount Burned: ${amount}
- Role: ${isAIAgent ? 'AI Agent' : 'Creator'}
- Previous Balance: ${balanceFormatted} BABY
- New Balance: ${newBalanceFormatted} BABY
- From: ${walletAddress}
- To: ${tokenAddress}
- Transaction: ${tx.hash}`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }

      } catch (error) {
        console.error('Error burning BABY tokens:', error)

        let errorMessage = 'An unexpected error occurred while burning tokens'
        if (error.message) {
          if (error.message.includes('Caller does not have burn permission')) {
            errorMessage = 'Permission denied: You do not have AI Agent or Creator role'
          } else if (error.message.includes('insufficient balance')) {
            errorMessage = `Insufficient balance: ${error.message}`
          } else if (error.message.includes('execution reverted')) {
            errorMessage = 'Transaction reverted: Contract execution failed'
          } else {
            errorMessage = error.message
          }
        }

        return {
          isError: true,
          content: [{ type: 'text', text: `Error burning BABY tokens: ${errorMessage}` }]
        }
      }
    }
  )
}
