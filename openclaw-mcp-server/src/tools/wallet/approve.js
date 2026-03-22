// Copyright 2025 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict'

import { z } from 'zod'
import { parseAmountToBaseUnits } from '../../utils/index.js'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

/**
 * Registers the 'approve' tool for token approvals.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function approve (server) {
  const supportedChains = server.getChains()

  server.registerTool(
    'approve',
    {
      title: 'Approve Token',
      description: `Approve a specific amount of tokens to a spender.

This tool approves tokens to be spent by a spender address (e.g., Aave lending pool, DEX router, bridge contract). Before executing, it quotes the transaction to show expected fees, shows you a confirmation dialog with all details, waits for your explicit approval, and only then broadcasts the transaction. This is a DESTRUCTIVE operation that will spend gas fees from your wallet.

Args:
  - chain (REQUIRED): The blockchain to approve on
  - token (REQUIRED): The token symbol to approve (must be registered)
  - spender (REQUIRED): The spender address that will receive approval
  - amount (REQUIRED): The amount to approve in human-readable units (e.g., "100" for 100 tokens)

Returns:
  Text format: "Approval successful! Hash: {hash}"
  
  Structured output:
  {
    "success": true,
    "hash": "0x123...",
    "chain": "ethereum",
    "token": "USDT",
    "spender": "0x...",
    "amount": "100",
    "fee": "21000000000000"
  }

Examples:
  - Use when: "Approve 100 USDT for Aave lending pool"
  - Use when: "Approve unlimited USDT for Uniswap router"
  - Use when: "Set allowance for token to be spent by contract"
  - Don't use when: Token is native (ETH, BTC, etc.) - native tokens don't need approval

Notes:
  - Native tokens (ETH, BTC, etc.) do not require approval
  - USDT on Ethereum has special behavior - may require reset to 0 before re-approving
  - Approval is a one-time transaction that enables future transfers by the spender
  - Approving unlimited (maximum amount) saves gas for future transactions

Error Handling:
  - Returns error if token symbol is not registered
  - Returns error if spender address is invalid
  - Returns error if wallet has insufficient funds for gas
  - Returns "Approval cancelled" if user declines confirmation`,
      inputSchema: z.object({
        chain: z.enum(supportedChains).describe('The blockchain to approve on'),
        token: z.string().describe('The token symbol to approve (e.g., "USDT")'),
        spender: z.string().describe('The spender address that will receive approval'),
        amount: z.string().describe('The amount to approve in human-readable units (e.g., "100")')
      }),
      outputSchema: z.object({
        success: z.boolean().describe('Whether the approval succeeded'),
        hash: z.string().describe('Transaction hash'),
        chain: z.string().describe('Blockchain'),
        token: z.string().describe('Token symbol'),
        spender: z.string().describe('Spender address'),
        amount: z.string().describe('Amount approved'),
        fee: z.string().describe('Gas fee paid')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ chain, token, spender, amount }) => {
      try {
        const tokenInfo = server.getTokenInfo(chain, token)
        if (!tokenInfo) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Token ${token} not registered for ${chain}.` }]
          }
        }

        const account = await server.wdk.getAccount(chain, 0)

        const baseAmount = parseAmountToBaseUnits(amount, tokenInfo.decimals)

        const options = {
          token: tokenInfo.address,
          spender,
          amount: baseAmount
        }

        const approveResult = await account.approve(options)

        const result = {
          success: true,
          hash: approveResult.hash,
          chain,
          token,
          spender,
          amount,
          fee: approveResult.fee.toString()
        }

        return {
          content: [{ type: 'text', text: `Approval successful! Hash: ${approveResult.hash}` }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error executing approval: ${error.message}` }]
        }
      }
    }
  )
}