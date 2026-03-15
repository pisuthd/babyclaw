/**
 * Get all BabyClaw lending markets with current rates and statistics
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { celo } from 'viem/chains'
import { getPublicClient } from '../clients.js'
import { CTOKEN_ABI, COMPTROLLER_ABI, LENDING_CONFIG, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../config.js'
import { formatUnits, parseUnits } from 'viem'
import { fetchPrices } from '../utils.js'

// CELO blocks per year (1 second block time = 31,536,000 blocks per year)
const BLOCKS_PER_YEAR = 31536000n

/**
 * Calculate APY from rate per block
 */
function calculateAPY(ratePerBlock: bigint, decimals: number = 18): string {
  const ratePerYear = ratePerBlock * BLOCKS_PER_YEAR
  const rateFormatted = parseFloat(formatUnits(ratePerYear, decimals))
  const apy = (Math.pow(1 + rateFormatted, 365) - 1) * 100
  return apy.toFixed(2)
}

/**
 * Get all lending markets
 */
export const getMarketsTool = tool({
  name: 'get_lending_markets',
  description: 'Get all BabyClaw lending markets on CELO chain with their current rates and statistics',
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
      .describe('Filter to show only active markets (optional, default: true)'),
  }),
  callback: async (input) => {
    try {
      const publicClient = getPublicClient()

      // Fetch market data for all tokens
      const markets = []
      const tokenSymbols = Object.keys(CTOKEN_ADDRESSES) as Array<keyof typeof CTOKEN_ADDRESSES>

      // Fetch token prices
      const prices = await fetchPrices()

      for (const tokenSymbol of tokenSymbols) {
        const cTokenAddress = CTOKEN_ADDRESSES[tokenSymbol]
        const tokenConfig = TOKEN_CONFIGS[tokenSymbol]

        // Get market info from Comptroller
        const [isListed, collateralFactor] = await publicClient.readContract({
          address: LENDING_CONFIG.COMPTROLLER,
          abi: COMPTROLLER_ABI,
          functionName: 'markets',
          args: [cTokenAddress],
          chain: celo,
        } as any) as [boolean, bigint]

        // Skip if not listed and filtering active markets
        if (input.filter_active !== false && !isListed) {
          continue
        }

        // Get cToken data
        const results = await Promise.all([
          publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'totalSupply',
            chain: celo,
          } as any),
          publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'totalBorrows',
            chain: celo,
          } as any),
          publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'getCash',
            chain: celo,
          } as any),
          publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'borrowRatePerBlock',
            chain: celo,
          } as any),
          publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'supplyRatePerBlock',
            chain: celo,
          } as any),
          publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'exchangeRateStored',
            chain: celo,
          } as any),
        ]) as [bigint, bigint, bigint, bigint, bigint, bigint]

        const [totalSupply, totalBorrows, cash, borrowRatePerBlock, supplyRatePerBlock, exchangeRate] = results

        // Calculate APYs
        const supplyApy = calculateAPY(supplyRatePerBlock as bigint, 18)
        const borrowApy = calculateAPY(borrowRatePerBlock as bigint, 18)

        // Calculate utilization rate: totalBorrows / (cash + totalBorrows)
        // This represents the percentage of available liquidity that is currently borrowed
        const totalAvailableLiquidity = (cash as bigint) + (totalBorrows as bigint)
        const utilizationRate = totalAvailableLiquidity > 0n
          ? ((totalBorrows as bigint * 100n) / totalAvailableLiquidity).toString()
          : '0'

        // Calculate total supply and borrows in token units
        const totalSupplyFormatted = formatUnits(
          (totalSupply as bigint * exchangeRate as bigint) / parseUnits('1', 18),
          tokenConfig.decimals
        )
        const totalBorrowsFormatted = formatUnits(
          totalBorrows as bigint,
          tokenConfig.decimals
        )

        // Collateral factor as percentage
        const collateralFactorPercent = ((collateralFactor as bigint * 100n) / parseUnits('1', 18)).toString()

        // Get token price
        const tokenPrice = prices[tokenSymbol] || 0

        markets.push({
          symbol: tokenSymbol,
          ctoken_address: cTokenAddress,
          underlying_address: tokenConfig.address,
          is_listed: isListed,
          collateral_factor: collateralFactorPercent,
          exchange_rate: formatUnits(exchangeRate as bigint, 18),
          total_supply: totalSupplyFormatted,
          total_borrows: totalBorrowsFormatted,
          total_cash: formatUnits(cash as bigint, tokenConfig.decimals),
          supply_apy: supplyApy,
          borrow_apy: borrowApy,
          utilization_rate: utilizationRate,
          decimals: tokenConfig.decimals,
          price_usd: tokenPrice,
          total_supply_usd: (parseFloat(totalSupplyFormatted) * tokenPrice).toFixed(2),
          total_borrows_usd: (parseFloat(totalBorrowsFormatted) * tokenPrice).toFixed(2),
        })
      }

      // Sort markets if requested
      if (input.sort_by) {
        const sortBy = input.sort_by
        const sortOrder = input.sort_order || 'desc'

        markets.sort((a: any, b: any) => {
          let aValue: number, bValue: number

          switch (sortBy) {
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

          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
        })
      }

      // Calculate summary statistics
      const totalMarkets = markets.length
      const avgSupplyApy =
        totalMarkets > 0
          ? (markets.reduce((sum: number, m: any) => sum + parseFloat(m.supply_apy), 0) / totalMarkets).toFixed(2)
          : '0.00'
      const avgBorrowApy =
        totalMarkets > 0
          ? (markets.reduce((sum: number, m: any) => sum + parseFloat(m.borrow_apy), 0) / totalMarkets).toFixed(2)
          : '0.00'

      const highestSupplyMarket = markets.length > 0
        ? markets.reduce(
            (max: any, m: any) => (parseFloat(m.supply_apy) > parseFloat(max.supply_apy) ? m : max),
            markets[0]
          )
        : null
      const highestBorrowMarket = markets.length > 0
        ? markets.reduce(
            (max: any, m: any) => (parseFloat(m.borrow_apy) > parseFloat(max.borrow_apy) ? m : max),
            markets[0]
          )
        : null

      // Calculate average utilization rate
      const avgUtilization =
        totalMarkets > 0
          ? (markets.reduce((sum, m: any) => sum + parseFloat(m.utilization_rate), 0) / totalMarkets).toFixed(2)
          : '0.00'

      // Calculate total TVL and borrows in USD
      const totalTVL = markets.reduce((sum: number, m: any) => sum + parseFloat(m.total_supply_usd), 0)
      const totalBorrowsUSD = markets.reduce((sum: number, m: any) => sum + parseFloat(m.total_borrows_usd), 0)

      return {
        status: 'success',
        message: `✅ Retrieved ${totalMarkets} lending markets`,
        network: {
          name: 'CELO',
          chain_id: 42220,
          native_currency: 'CELO',
        },
        markets: markets,
        summary: {
          total_markets: totalMarkets,
          avg_supply_apy: avgSupplyApy,
          avg_borrow_apy: avgBorrowApy,
          highest_supply_apy: {
            market: highestSupplyMarket?.symbol || 'N/A',
            apy: highestSupplyMarket?.supply_apy || '0.00',
          },
          highest_borrow_apy: {
            market: highestBorrowMarket?.symbol || 'N/A',
            apy: highestBorrowMarket?.borrow_apy || '0.00',
          },
          total_tvl_usd: totalTVL.toFixed(2),
          total_borrows_usd: totalBorrowsUSD.toFixed(2),
          avg_utilization_rate: avgUtilization + '%',
        },
        market_analysis: {
          best_for_supplying: markets
            .filter((m: any) => parseFloat(m.supply_apy) > 0)
            .sort((a: any, b: any) => parseFloat(b.supply_apy) - parseFloat(a.supply_apy))
            .slice(0, 3)
            .map((m: any) => ({ market: m.symbol, apy: m.supply_apy, utilization: m.utilization_rate + '%' })),
          best_for_borrowing: markets
            .filter((m: any) => parseFloat(m.borrow_apy) > 0 && parseFloat(m.utilization_rate) < 80)
            .sort((a: any, b: any) => parseFloat(a.borrow_apy) - parseFloat(b.borrow_apy))
            .slice(0, 3)
            .map((m: any) => ({ market: m.symbol, apy: m.borrow_apy, utilization: m.utilization_rate + '%' })),
          high_utilization_markets: markets
            .filter((m: any) => parseFloat(m.utilization_rate) > 80)
            .sort((a: any, b: any) => parseFloat(b.utilization_rate) - parseFloat(a.utilization_rate))
            .map((m: any) => ({ market: m.symbol, utilization: m.utilization_rate + '%', supply_apy: m.supply_apy })),
        },
        recommendations: [
          'Compare supply and borrow rates across markets',
          'Check utilization rates - high utilization (>80%) may indicate increasing rates',
          'Consider market depth (total supply) for larger positions',
          'Monitor rates regularly as they change with market conditions',
          'High utilization markets may offer better yields but carry more risk',
          'Diversify across multiple markets to reduce concentration risk',
          'Remember to enter markets before supplying to enable collateral usage',
        ],
      }
    } catch (error: any) {
      throw new Error(`Failed to get markets: ${error.message}`)
    }
  },
})