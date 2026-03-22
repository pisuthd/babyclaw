 
'use strict'

import { z } from 'zod'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { fetchPrices, formatAmountFromBaseUnits, createReadContract } from './utils.js'
import { CTOKEN_ABI, COMPTROLLER_ABI, CTOKEN_ADDRESSES, TOKEN_CONFIGS, LENDING_CONFIG } from './config.js'

// CELO blocks per year (1 second block time = 31,536,000 blocks per year)
const BLOCKS_PER_YEAR = 31536000n

/**
 * Calculate APY from rate per block
 * Compound-like protocols: APY = (ratePerBlock * BLOCKS_PER_YEAR / 1e18) * 100
 */
function calculateAPY (ratePerBlock) {
  const ratePerYear = ratePerBlock * BLOCKS_PER_YEAR
  const apy = (Number(ratePerYear) / 1e18) * 100
  return apy.toFixed(2)
}

/**
 * Registers the 'babyclawGetMarkets' tool for getting BabyClaw lending markets.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawGetMarkets (server) {
  server.registerTool(
    'babyclawGetMarkets',
    {
      title: 'Get BabyClaw Lending Markets',
      description: `Get all BabyClaw lending markets on CELO chain with current rates and statistics.

This tool retrieves market data including supply APY, borrow APY, utilization rates, and total value locked (TVL) for all supported tokens (CELO, BABY, USDT). This is a read-only operation that does NOT modify the wallet or perform any transactions.

Args:
  - sort_by (OPTIONAL): Sort markets by 'supply_apy', 'borrow_apy', 'total_supply', 'total_borrows', or 'utilization_rate'
  - sort_order (OPTIONAL): Sort order 'asc' or 'desc' (default: 'desc')
  - filter_active (OPTIONAL): Filter to show only active markets (default: true)

Returns:
  Text format: Detailed market information with rates and statistics
  
  Structured output:
  {
    "status": "success",
    "network": { "name": "CELO", "chain_id": 42220 },
    "markets": [...],
    "summary": { ... }
  }
  
Examples:
  - Use when: "What are the current lending rates on BabyClaw?"
  - Use when: "Show me all available markets with their APYs"
  - Use when: "Which market has the highest supply rate?"
  - Don't use when: You need to supply or borrow tokens (use babyclawSupply or babyclawBorrow instead)

Error Handling:
  - Returns error if RPC call fails
  - Returns error if price fetching fails (uses fallback prices)`,
      inputSchema: z.object({
        sort_by: z.enum(['supply_apy', 'borrow_apy', 'total_supply', 'total_borrows', 'utilization_rate'])
          .optional()
          .describe('Sort markets by specified metric (optional)'),
        sort_order: z.enum(['asc', 'desc'])
          .optional()
          .default('desc')
          .describe('Sort order (optional, default: desc)'),
        filter_active: z.boolean()
          .optional()
          .default(true)
          .describe('Filter to show only active markets (optional, default: true)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the request'),
        network: z.object({
          name: z.string().describe('Network name'),
          chain_id: z.number().describe('Chain ID')
        }),
        markets: z.array(z.object({
          symbol: z.string().describe('Token symbol'),
          supply_apy: z.string().describe('Supply APY'),
          borrow_apy: z.string().describe('Borrow APY'),
          utilization_rate: z.string().describe('Utilization rate'),
          total_supply_usd: z.string().describe('Total supply in USD'),
          total_borrows_usd: z.string().describe('Total borrows in USD')
        })),
        summary: z.object({
          total_markets: z.number().describe('Total number of markets'),
          avg_supply_apy: z.string().describe('Average supply APY'),
          avg_borrow_apy: z.string().describe('Average borrow APY'),
          total_tvl_usd: z.string().describe('Total TVL in USD')
        })
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ sort_by, sort_order, filter_active }) => {
      try {
        const account = await server.wdk.getAccount('celo', 0) 

        // Fetch token prices
        const prices = await fetchPrices()

        // Create comptroller contract
        const comptrollerContract = createReadContract(LENDING_CONFIG.COMPTROLLER, COMPTROLLER_ABI, account)

        // Fetch market data for all tokens
        const markets = []
        const tokenSymbols = Object.keys(CTOKEN_ADDRESSES)

        for (const tokenSymbol of tokenSymbols) {
          const cTokenAddress = CTOKEN_ADDRESSES[tokenSymbol]
          const tokenConfig = TOKEN_CONFIGS[tokenSymbol]

          // Get market info from Comptroller
          const [isListed, collateralFactor] = await comptrollerContract.markets(cTokenAddress)

          // Skip if not listed and filtering active markets
          if (filter_active !== false && !isListed) {
            continue
          }

          // Create cToken contract
          const cTokenContract = createReadContract(cTokenAddress, CTOKEN_ABI, account)

          // Get cToken data - use sequential calls to avoid rate limiting
          const totalSupply = await cTokenContract.totalSupply()
          const totalBorrows = await cTokenContract.totalBorrows()
          const cash = await cTokenContract.getCash()
          const borrowRatePerBlock = await cTokenContract.borrowRatePerBlock()
          const supplyRatePerBlock = await cTokenContract.supplyRatePerBlock()
          const exchangeRate = await cTokenContract.exchangeRateStored()

          // Calculate APYs
          const supplyApy = calculateAPY(borrowRatePerBlock)
          const borrowApy = calculateAPY(supplyRatePerBlock)

          // Calculate utilization rate
          const totalAvailableLiquidity = (cash) + (totalBorrows)
          const utilizationRate = totalAvailableLiquidity > 0n
            ? ((totalBorrows * 100n) / totalAvailableLiquidity).toString()
            : '0'

          // Calculate total supply and borrows in token units
          const totalSupplyFormatted = formatAmountFromBaseUnits(
            (totalSupply * exchangeRate) / 1000000000000000000n,
            tokenConfig.decimals
          )
          const totalBorrowsFormatted = formatAmountFromBaseUnits(
            totalBorrows,
            tokenConfig.decimals
          )

          // Collateral factor as percentage
          const collateralFactorPercent = ((collateralFactor * 100n) / 1000000000000000000n).toString()

          // Get token price
          const tokenPrice = prices[tokenSymbol] || 0

          markets.push({
            symbol: tokenSymbol,
            ctoken_address: cTokenAddress,
            underlying_address: tokenConfig.address,
            is_listed: isListed,
            collateral_factor: collateralFactorPercent,
            exchange_rate: formatAmountFromBaseUnits(exchangeRate, 18),
            total_supply: totalSupplyFormatted,
            total_borrows: totalBorrowsFormatted,
            total_cash: formatAmountFromBaseUnits(cash, tokenConfig.decimals),
            supply_apy: supplyApy,
            borrow_apy: borrowApy,
            utilization_rate: utilizationRate,
            decimals: tokenConfig.decimals,
            price_usd: tokenPrice,
            total_supply_usd: (parseFloat(totalSupplyFormatted) * tokenPrice).toFixed(2),
            total_borrows_usd: (parseFloat(totalBorrowsFormatted) * tokenPrice).toFixed(2)
          })
        }

        // Sort markets if requested
        if (sort_by) {
          markets.sort((a, b) => {
            let aValue, bValue

            switch (sort_by) {
              case 'supply_apy':
                aValue = parseFloat(a.supply_apy)
                bValue = parseFloat(b.supply_apy)
                break
              case 'borrow_apy':
                aValue = parseFloat(a.borrow_apy)
                bValue = parseFloat(b.borrow_apy)
                break
              case 'total_supply':
                aValue = parseFloat(a.total_supply)
                bValue = parseFloat(b.total_supply)
                break
              case 'total_borrows':
                aValue = parseFloat(a.total_borrows)
                bValue = parseFloat(b.total_borrows)
                break
              case 'utilization_rate':
                aValue = parseFloat(a.utilization_rate)
                bValue = parseFloat(b.utilization_rate)
                break
              default:
                return 0
            }

            return sort_order === 'desc' ? bValue - aValue : aValue - bValue
          })
        }

        // Calculate summary statistics
        const totalMarkets = markets.length
        const avgSupplyApy = totalMarkets > 0
          ? (markets.reduce((sum, m) => sum + parseFloat(m.supply_apy), 0) / totalMarkets).toFixed(2)
          : '0.00'
        const avgBorrowApy = totalMarkets > 0
          ? (markets.reduce((sum, m) => sum + parseFloat(m.borrow_apy), 0) / totalMarkets).toFixed(2)
          : '0.00'

        const highestSupplyMarket = markets.length > 0
          ? markets.reduce((max, m) => (parseFloat(m.supply_apy) > parseFloat(max.supply_apy) ? m : max), markets[0])
          : null

        const highestBorrowMarket = markets.length > 0
          ? markets.reduce((max, m) => (parseFloat(m.borrow_apy) > parseFloat(max.borrow_apy) ? m : max), markets[0])
          : null

        // Calculate average utilization rate
        const avgUtilization = totalMarkets > 0
          ? (markets.reduce((sum, m) => sum + parseFloat(m.utilization_rate), 0) / totalMarkets).toFixed(2)
          : '0.00'

        // Calculate total TVL and borrows in USD
        const totalTVL = markets.reduce((sum, m) => sum + parseFloat(m.total_supply_usd), 0)
        const totalBorrowsUSD = markets.reduce((sum, m) => sum + parseFloat(m.total_borrows_usd), 0)

        const result = {
          status: 'success',
          message: `✅ Retrieved ${totalMarkets} lending markets`,
          network: {
            name: 'CELO',
            chain_id: 42220,
            native_currency: 'CELO'
          },
          markets,
          recommendations: [
            'Compare supply and borrow rates across markets',
            'Check utilization rates - high utilization (>80%) may indicate increasing rates',
            'Consider market depth (total supply) for larger positions',
            'Monitor rates regularly as they change with market conditions',
            'High utilization markets may offer better yields but carry more risk',
            'Diversify across multiple markets to reduce concentration risk',
            'Remember to enter markets before supplying to enable collateral usage'
          ]
        }

        // Format result as readable text for the agent
        const marketList = markets.map(m => 
          `${m.symbol}: Supply APY ${m.supply_apy}%, Borrow APY ${m.borrow_apy}%, Utilization ${m.utilization_rate}%, TVL $${m.total_supply_usd}`
        ).join('\n')
        
        const contentText = `✅ Retrieved ${totalMarkets} BabyClaw lending markets on CELO chain

${marketList}

Summary:
- Total Markets: ${totalMarkets}
- Average Supply APY: ${avgSupplyApy}%
- Average Borrow APY: ${avgBorrowApy}%
- Total TVL: $${totalTVL.toFixed(2)}
- Total Borrows: $${totalBorrowsUSD.toFixed(2)}
- Average Utilization: ${avgUtilization}%

Top Supply Market: ${highestSupplyMarket?.symbol || 'N/A'} (${highestSupplyMarket?.supply_apy || '0.00'}%)
Top Borrow Market: ${highestBorrowMarket?.symbol || 'N/A'} (${highestBorrowMarket?.borrow_apy || '0.00'}%)`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting BabyClaw markets: ${error.message}` }]
        }
      }
    }
  )
}