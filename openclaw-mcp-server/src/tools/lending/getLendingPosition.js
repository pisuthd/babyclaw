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

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

/**
 * Registers the 'getLendingPosition' tool for checking lending positions.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function getLendingPosition (server) {
  const lendingChains = server.getLendingChains()

  if (lendingChains.length === 0) return

  server.registerTool(
    'getLendingPosition',
    {
      title: 'Get Lending Position',
      description: `Get your current lending position and account data from the lending protocol.

This tool retrieves your account's current lending position including collateral, debt, available borrows, and health factor. This is a read-only operation that does NOT modify the wallet or perform any transactions.

Args:
  - chain (REQUIRED): The blockchain to check position on
  - address (OPTIONAL): Wallet address to check (defaults to current wallet)

Returns:
  Text format: Detailed position information
  
  Structured output:
  {
    "status": "success",
    "chain": "ethereum",
    "protocol": "aave",
    "address": "0x...",
    "totalCollateralBase": "1000000000",
    "totalDebtBase": "500000000",
    "availableBorrowsBase": "450000000",
    "currentLiquidationThreshold": "8250",
    "ltv": "7500",
    "healthFactor": "1.50"
  }

Examples:
  - Use when: "What's my lending position on Aave?"
  - Use when: "Show me my collateral and debt"
  - Use when: "What's my health factor?"
  - Use when: "How much can I borrow?"
  - Don't use when: You need to supply or borrow (use supply or borrow instead)

Error Handling:
  - Returns error if no lending protocol registered for the chain
  - Returns error if RPC call fails
  - Returns error if wallet is not registered`,
      inputSchema: z.object({
        chain: z.enum(lendingChains).describe('The blockchain to check position on'),
        address: z.string().optional().describe('Wallet address to check (defaults to current wallet)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the query'),
        chain: z.string().describe('Blockchain'),
        protocol: z.string().describe('Lending protocol name'),
        address: z.string().describe('Wallet address'),
        totalCollateralBase: z.string().describe('Total collateral in base units'),
        totalDebtBase: z.string().describe('Total debt in base units'),
        availableBorrowsBase: z.string().describe('Available amount to borrow in base units'),
        currentLiquidationThreshold: z.string().describe('Current liquidation threshold'),
        ltv: z.string().describe('Current loan-to-value ratio'),
        healthFactor: z.string().describe('Current health factor')
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ chain, address }) => {
      try {
        const protocols = server.getLendingProtocols(chain)

        if (protocols.length === 0) {
          return {
            isError: true,
            content: [{ type: 'text', text: `No lending protocol registered for ${chain}.` }]
          }
        }

        const label = protocols[0]
        const account = await server.wdk.getAccount(chain, 0)
        const lendingProtocol = account.getLendingProtocol(label)

        const data = await lendingProtocol.getAccountData()

        const walletAddress = address || await account.getAddress()

        // Format health factor properly (convert from Ray to human-readable)
        // If debt is 0, health factor is effectively infinite
        const hasDebt = Number(data.totalDebtBase) > 0
        const healthFactor = hasDebt 
          ? Number(data.healthFactor) / 1e18 
          : '∞'
        
        // Format percentages (already in base units, just divide by 100)
        const liquidationThreshold = Number(data.currentLiquidationThreshold) / 100
        const ltv = Number(data.ltv) / 100

        const result = {
          status: 'success',
          chain,
          protocol: label,
          address: walletAddress,
          totalCollateralBase: data.totalCollateralBase.toString(),
          totalDebtBase: data.totalDebtBase.toString(),
          availableBorrowsBase: data.availableBorrowsBase.toString(),
          currentLiquidationThreshold: data.currentLiquidationThreshold.toString(),
          ltv: data.ltv.toString(),
          healthFactor: data.healthFactor.toString()
        }

        const textOutput = `Lending Position on ${label} (${chain})

Address: ${walletAddress}

Collateral & Debt:
- Total Collateral: ${data.totalCollateralBase.toString()}
- Total Debt: ${data.totalDebtBase.toString()}
- Available to Borrow: ${data.availableBorrowsBase.toString()}

Risk Metrics:
- Health Factor: ${typeof healthFactor === 'number' ? healthFactor.toFixed(2) : healthFactor}
- Liquidation Threshold: ${liquidationThreshold.toFixed(2)}%
- Loan-to-Value (LTV): ${ltv.toFixed(2)}%

Health Factor Guide:
- > 2.0: Very safe
- 1.5 - 2.0: Safe
- 1.2 - 1.5: Caution - consider adding collateral
- < 1.2: Warning - risk of liquidation
- < 1.0: Liquidation risk imminent
`

        return {
          content: [{ type: 'text', text: textOutput }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting lending position: ${error.message}` }]
        }
      }
    }
  )
}