 
'use strict'

import { z } from 'zod'
import { ethers } from 'ethers'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { COMPTROLLER_ABI, CTOKEN_ADDRESSES, LENDING_CONFIG } from './config.js'

/**
 * Registers 'babyclawEnterMarket' tool for entering lending markets.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawEnterMarket (server) {
  server.registerTool(
    'babyclawEnterMarket',
    {
      title: 'Enter BabyClaw Lending Market',
      description: `Enter a BabyClaw lending market to enable collateral usage.

This tool enters a lending market, allowing you to use your supplied tokens as collateral for borrowing. You must enter a market before you can use its supplied tokens as collateral to borrow other assets. This is a WRITE operation that modifies the blockchain and costs gas fees.

Args:
  - token (REQUIRED): Token symbol for structuredContenthe market to enter (CELO, BABY, or USDT)

Returns:
  Text format: Transaction confirmation
  
  Structured output:
  {
    "status": "success",
    "token": "BABY",
    "ctoken_address": "0x...",
    "transaction_hash": "0x...",
    "collateral_enabled": true
  }
  
Examples:
  - Use when: "I want to use my BABY as collateral"
  - Use when: "Enter the BABY market"
  - Use when: "Enable my CELO as collateral for borrowing"
  - Don't use when: You want to exit a market (use babyclawExitMarket if available)
  - Don't use when: Market is already entered (check with babyclawGetLiquidity first)

Error Handling:
  - Returns error if token is not supported
  - Returns error if transaction fails
  - Returns error if wallet has insufficient funds for gas`,

      inputSchema: z.object({
        token: z.enum(['CELO', 'BABY', 'USDT'])
          .describe('Token symbol for the market to enter')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the request'),
        token: z.string().describe('Token symbol'),
        ctoken_address: z.string().describe('cToken contract address'),
        transaction_hash: z.string().describe('Transaction hash'),
        collateral_enabled: z.boolean().describe('Whether collateral is now enabled')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ token }) => {
      try {
        const account = await server.wdk.getAccount('celo', 0)
        const address = await account.getAddress()

        // Get cToken address
        const cTokenAddress = CTOKEN_ADDRESSES[token]

        if (!cTokenAddress) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Token ${token} is not supported by BabyClaw` }]
          }
        }

        // Create interface for encoding function call data
        const iface = new ethers.Interface(COMPTROLLER_ABI)
        
        // Send enter markets transaction
        const tx = await account.sendTransaction({
          to: LENDING_CONFIG.COMPTROLLER,
          value: 0n,
          data: iface.encodeFunctionData('enterMarkets', [[cTokenAddress]])
        })

        const result = {
          status: 'success',
          message: `✅ Entered ${token} market on BabyClaw. Your supplied ${token} can now be used as collateral.`,
          token: token,
          ctoken_address: cTokenAddress,
          ctoken_name: `c${token}`,
          transaction_hash: typeof tx === 'string' ? tx : (tx.hash || tx.toString()),
          from: address,
          to: LENDING_CONFIG.COMPTROLLER,
          collateral_enabled: true,
          next_steps: [
            `Your ${token} is now enabled as collateral`,
            'You can now supply tokens using babyclawSupply',
            'You can now borrow against your collateral using babyclawBorrow',
            'Monitor your health factor using babyclawGetLiquidity to avoid liquidation',
            'Consider diversifying collateral across multiple markets'
          ]
        }

        // Format result as readable text for the agent
        const contentText = `${result.message}

Market Entry Details:
- Token: ${token}
- cToken: ${cTokenAddress} (c${token})
- Comptroller: ${LENDING_CONFIG.COMPTROLLER}
- From: ${address}
- Transaction: ${tx.hash}

✅ Your ${token} is now enabled as collateral
- You can now supply tokens using babyclawSupply
- You can now borrow against your collateral using babyclawBorrow
- Monitor your health factor using babyclawGetLiquidity to avoid liquidation
- Consider diversifying collateral across multiple markets`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error entering market: ${error.message}` }]
        }
      }
    }
  )
}