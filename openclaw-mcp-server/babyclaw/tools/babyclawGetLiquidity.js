 
'use strict'

import { z } from 'zod'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { fetchPrices, formatAmountFromBaseUnits, createReadContract } from './utils.js'
import { CTOKEN_ABI, COMPTROLLER_ABI, CTOKEN_ADDRESSES, TOKEN_CONFIGS, LENDING_CONFIG } from './config.js'

/**
 * Registers 'babyclawGetLiquidity' tool for getting account liquidity and health.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawGetLiquidity (server) {
  server.registerTool(
    'babyclawGetLiquidity',
    {
      title: 'Get BabyClaw Account Liquidity',
      description: `Get account liquidity, health factor, and positions in BabyClaw lending protocol.

This tool retrieves the account's current liquidity, health factor, and all supply/borrow positions across all markets. This is a read-only operation that does NOT modify the wallet or perform any transactions.

Args:
  - address (OPTIONAL): Wallet address to check (defaults to current wallet)

Returns:
  Text format: Detailed account liquidity and position information
  
  Structured output:
  {
    "status": "success",
    "address": "0x...",
    "liquidity": { ... },
    "positions": { ... },
    "health_factor": "1.50"
  }
  
Examples:
  - Use when: "What's my account health on BabyClaw?"
  - Use when: "Show me my current supply and borrow positions"
  - Use when: "How much can I borrow?"
  - Use when: "Am I close to liquidation?"
  - Don't use when: You need to supply, borrow, or withdraw (use babyclawSupply, babyclawBorrow, or babyclawWithdraw instead)

Error Handling:
  - Returns error if RPC call fails
  - Returns error if wallet is not registered`,

      inputSchema: z.object({
        address: z.string()
          .optional()
          .describe('Wallet address to check (defaults to current wallet)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the request'),
        address: z.string().describe('Wallet address'),
        health_factor: z.string().describe('Health factor (>1 means healthy)'),
        liquidity: z.object({
          total_collateral_usd: z.string().describe('Total collateral value in USD'),
          total_borrow_usd: z.string().describe('Total borrow value in USD'),
          available_liquidity_usd: z.string().describe('Available liquidity to borrow in USD'),
          shortfall_usd: z.string().describe('Shortfall if liquidatable (0 if healthy)')
        }),
        positions: z.object({
          supplies: z.array(z.object({
            symbol: z.string().describe('Token symbol'),
            balance: z.string().describe('Supplied balance'),
            value_usd: z.string().describe('Value in USD')
          })),
          borrows: z.array(z.object({
            symbol: z.string().describe('Token symbol'),
            balance: z.string().describe('Borrowed balance'),
            value_usd: z.string().describe('Value in USD')
          }))
        })
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ address }) => {
      try {
        const account = await server.wdk.getAccount('celo', 0)
        const walletAddress = address || await account.getAddress()

        // Fetch token prices
        const prices = await fetchPrices()

        // Create comptroller contract
        const comptrollerContract = createReadContract(LENDING_CONFIG.COMPTROLLER, COMPTROLLER_ABI, account)

        // Get account liquidity from Comptroller - use sequential calls to avoid rate limiting
        const liquidityResult = await comptrollerContract.getAccountLiquidity(walletAddress)
        const assetsIn = await comptrollerContract.getAssetsIn(walletAddress)

        const [errorCode, liquidityAmount, shortfallAmount] = liquidityResult

        // Always process positions - don't return early based on initial checks
        // The position calculation loop will correctly determine if there are positions

        // Get supply positions for entered markets
        const supplyPositions = []
        const borrowPositions = []

        for (const cTokenAddress of assetsIn) {
          // Find token symbol for this cToken
          let tokenSymbol = null
          for (const [symbol, addr] of Object.entries(CTOKEN_ADDRESSES)) {
            if (addr.toLowerCase() === cTokenAddress.toLowerCase()) {
              tokenSymbol = symbol
              break
            }
          }

          if (!tokenSymbol) continue

          const cTokenConfig = TOKEN_CONFIGS[tokenSymbol]
          const tokenPrice = prices[tokenSymbol] || 0

          // Create cToken contract
          const cTokenContract = createReadContract(cTokenAddress, CTOKEN_ABI, account)

          // Get supply balance
          const cTokenBalance = await cTokenContract.balanceOf(walletAddress)

          // Get borrow balance
          const borrowBalance = await cTokenContract.borrowBalanceStored(walletAddress)

          // Get exchange rate
          const exchangeRate = await cTokenContract.exchangeRateStored()

          // Calculate supply in underlying tokens
          const supplyUnderlying = (cTokenBalance * exchangeRate) / 1000000000000000000n
          const supplyFormatted = formatAmountFromBaseUnits(supplyUnderlying, cTokenConfig.decimals)
          const supplyValueUSD = (parseFloat(supplyFormatted) * tokenPrice).toFixed(2)

          // Calculate borrow in underlying tokens
          const borrowFormatted = formatAmountFromBaseUnits(borrowBalance, cTokenConfig.decimals)
          const borrowValueUSD = (parseFloat(borrowFormatted) * tokenPrice).toFixed(2)

          // Add to positions if non-zero
          if (parseFloat(supplyValueUSD) > 0) {
            supplyPositions.push({
              symbol: tokenSymbol,
              ctoken_address: cTokenAddress,
              balance: supplyFormatted,
              value_usd: supplyValueUSD,
              ctoken_balance: formatAmountFromBaseUnits(cTokenBalance, 18),
              exchange_rate: formatAmountFromBaseUnits(exchangeRate, 18)
            })
          }

          if (parseFloat(borrowValueUSD) > 0) {
            borrowPositions.push({
              symbol: tokenSymbol,
              ctoken_address: cTokenAddress,
              balance: borrowFormatted,
              value_usd: borrowValueUSD,
              collateral_for_borrow: supplyPositions.some(s => s.symbol === tokenSymbol)
            })
          }
        }

        // Calculate totals
        const totalSupplyUSD = supplyPositions.reduce((sum, p) => sum + parseFloat(p.value_usd), 0)
        const totalBorrowUSD = borrowPositions.reduce((sum, p) => sum + parseFloat(p.value_usd), 0)

        // Check if account truly has no positions
        if (supplyPositions.length === 0 && borrowPositions.length === 0) {
          return {
            content: [{ type: 'text', text: `Account ${walletAddress} has no positions in BabyClaw.\n\nTo get started:\n  1. Use babyclawGetMarkets to see available markets\n  2. Use babyclawSupply to deposit tokens and earn interest\n  3. Use babyclawEnterMarket to enable collateral for borrowing` }],
            structuredContent: {
              status: 'success',
              address: walletAddress,
              message: 'No positions found',
              liquidity: {
                total_collateral_usd: '0.00',
                total_borrow_usd: '0.00',
                available_liquidity_usd: '0.00',
                shortfall_usd: '0.00'
              },
              positions: {
                supplies: [],
                borrows: []
              },
              health_factor: '∞',
              summary: {
                total_markets_used: assetsIn.length,
                total_supply_positions: 0,
                total_borrow_positions: 0
              }
            }
          }
        }

        // Format liquidity amounts (18 decimals for USD values)
        const liquidityUSD = formatAmountFromBaseUnits(liquidityAmount, 18)
        const shortfallUSD = formatAmountFromBaseUnits(shortfallAmount, 18)

        // Calculate health factor
        let healthFactor = '∞'
        if (totalBorrowUSD > 0) {
          healthFactor = (totalSupplyUSD / totalBorrowUSD).toFixed(2)
        }

        const result = {
          status: 'success',
          address: walletAddress,
          network: {
            name: 'CELO',
            chain_id: 42220
          },
          health_factor: healthFactor,
          health_status: totalBorrowUSD === 0 ? 'No borrows' : parseFloat(healthFactor) >= 1.5 ? 'Healthy' : parseFloat(healthFactor) >= 1.0 ? 'Warning' : 'Danger - Liquidation Risk',
          liquidity: {
            total_collateral_usd: totalSupplyUSD.toFixed(2),
            total_borrow_usd: totalBorrowUSD.toFixed(2),
            available_liquidity_usd: parseFloat(liquidityUSD).toFixed(2),
            shortfall_usd: parseFloat(shortfallUSD).toFixed(2)
          },
          positions: {
            supplies: supplyPositions,
            borrows: borrowPositions
          },
          summary: {
            total_markets_used: assetsIn.length,
            total_supply_positions: supplyPositions.length,
            total_borrow_positions: borrowPositions.length,
            best_collateral: supplyPositions.length > 0
              ? supplyPositions.reduce((max, p) => parseFloat(p.value_usd) > parseFloat(max.value_usd) ? p : max, supplyPositions[0])
              : null,
            largest_borrow: borrowPositions.length > 0
              ? borrowPositions.reduce((max, p) => parseFloat(p.value_usd) > parseFloat(max.value_usd) ? p : max, borrowPositions[0])
              : null
          },
          recommendations: []
        }

        // Add recommendations based on account state
        if (parseFloat(healthFactor) < 1.5 && parseFloat(healthFactor) >= 1.0) {
          result.recommendations.push('⚠️ Health factor is low. Consider adding more collateral or repaying debt to avoid liquidation.')
        } else if (parseFloat(healthFactor) < 1.0) {
          result.recommendations.push('🚨 Health factor is below 1.0! Your position is at risk of liquidation. Add collateral or repay debt immediately.')
        }

        if (parseFloat(result.liquidity.available_liquidity_usd) > 0 && totalBorrowUSD > 0) {
          result.recommendations.push(`You can borrow up to $${result.liquidity.available_liquidity_usd} more with your current collateral.`)
        }

        if (supplyPositions.length > 0 && borrowPositions.length === 0) {
          result.recommendations.push('You have supplied assets but no borrows. Consider borrowing to leverage your position or use babyclawEnterMarket to enable collateral.')
        }

        if (borrowPositions.length > 0 && parseFloat(healthFactor) < 2.0) {
          result.recommendations.push('Monitor your health factor closely. Market volatility could push you below 1.0.')
        }

        // Format result as readable text for the agent
        let contentText = `✅ Account Liquidity Report for ${walletAddress}

Health Factor: ${healthFactor}
Status: ${result.health_status}

Collateral & Debt:
- Total Collateral: $${result.liquidity.total_collateral_usd}
- Total Borrows: $${result.liquidity.total_borrow_usd}
- Available Liquidity: $${result.liquidity.available_liquidity_usd}
- Shortfall: $${result.liquidity.shortfall_usd}
`

        if (supplyPositions.length > 0) {
          contentText += `\n\nSupply Positions:\n${supplyPositions.map(p => `  • ${p.symbol}: ${p.balance} ($${p.value_usd})`).join('\n')}`
        }

        if (borrowPositions.length > 0) {
          contentText += `\n\nBorrow Positions:\n${borrowPositions.map(p => `  • ${p.symbol}: ${p.balance} ($${p.value_usd})`).join('\n')}`
        }

        if (result.recommendations.length > 0) {
          contentText += `\n\nRecommendations:\n${result.recommendations.map(r => `  ${r}`).join('\n')}`
        }

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        console.error('Full error in getLiquidity:', error)
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting account liquidity: ${error.message || error.toString()}\n\nDetails: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}` }]
        }
      }
    }
  )
}