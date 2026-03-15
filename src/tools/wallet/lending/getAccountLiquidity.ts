/**
 * Get account liquidity information from BabyClaw lending market
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { formatUnits } from 'viem'
import { celo } from 'viem/chains'
import { getPublicClient } from '../clients.js'
import { CTOKEN_ABI, COMPTROLLER_ABI, LENDING_CONFIG, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from '../config.js'
import { fetchPrices } from '../utils.js'

/**
 * Get account liquidity, health factor, and borrowing capacity
 */
export const getAccountLiquidityTool = tool({
  name: 'get_account_liquidity',
  description: 'Check account liquidity, health factor, and borrowing capacity on BabyClaw lending market for CELO chain',
  inputSchema: z.object({
    account_address: z.string().optional().describe('Account address to check (optional, defaults to wallet address)'),
  }),
  callback: async (input) => {
    try {
      const publicClient = getPublicClient()

      // Get account address - use provided address or get from wallet
      const accountAddress = input.account_address

      // Fetch token prices
      const prices = await fetchPrices()
      console.log('📊 Using prices:', prices)

      // Get account liquidity
      const [error, liquidity, shortfall] = await publicClient.readContract({
        address: LENDING_CONFIG.COMPTROLLER,
        abi: COMPTROLLER_ABI,
        functionName: 'getAccountLiquidity',
        args: [accountAddress as `0x${string}`],
        chain: celo,
      } as any) as [bigint, bigint, bigint]

      // Get markets the account is in
      const marketsIn = await publicClient.readContract({
        address: LENDING_CONFIG.COMPTROLLER,
        abi: COMPTROLLER_ABI,
        functionName: 'getAssetsIn',
        args: [accountAddress as `0x${string}`],
        chain: celo,
      } as any) as `0x${string}`[]

      // Calculate positions for each market
      const positions = []
      let totalCollateralUSD = 0
      let totalBorrowUSD = 0

      for (const cTokenAddress of marketsIn) {
        const tokenSymbol = Object.keys(CTOKEN_ADDRESSES).find(
          (key) => CTOKEN_ADDRESSES[key as keyof typeof CTOKEN_ADDRESSES] === cTokenAddress
        )

        if (tokenSymbol) {
          const decimals = TOKEN_CONFIGS[tokenSymbol as keyof typeof TOKEN_CONFIGS]?.decimals ?? 18

          // Get supply balance
          const cTokenBalance = await publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'balanceOf',
            args: [accountAddress as `0x${string}`],
            chain: celo,
          } as any)

          const exchangeRate = await publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'exchangeRateStored',
            args: [],
            chain: celo,
          } as any)

          const supplyBalance = (Number(cTokenBalance) * Number(exchangeRate)) / 1e18 / Math.pow(10, decimals)

          // Get borrow balance
          const borrowBalance = await publicClient.readContract({
            address: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'borrowBalanceStored',
            args: [accountAddress as `0x${string}`],
            chain: celo,
          } as any)

          const borrowBalanceFormatted = Number(borrowBalance) / Math.pow(10, decimals)

          // Get market collateral factor
          const [isListed, collateralFactor] = await publicClient.readContract({
            address: LENDING_CONFIG.COMPTROLLER,
            abi: COMPTROLLER_ABI,
            functionName: 'markets',
            args: [cTokenAddress],
            chain: celo,
          } as any) as [boolean, bigint]

          const collateralFactorFormatted = Number(collateralFactor) / 1e18

          // Get token price
          const tokenPrice = prices[tokenSymbol] || prices[tokenSymbol.toUpperCase()] || 1

          // Calculate USD values using real prices
          const supplyValueUSD = supplyBalance * tokenPrice
          const borrowValueUSD = borrowBalanceFormatted * tokenPrice

          totalCollateralUSD += supplyValueUSD
          totalBorrowUSD += borrowValueUSD

          if (supplyBalance > 0 || borrowBalanceFormatted > 0) {
            positions.push({
              symbol: tokenSymbol,
              ctoken_address: cTokenAddress,
              supply_balance: supplyBalance.toFixed(6),
              borrow_balance: borrowBalanceFormatted.toFixed(6),
              collateral_factor: (collateralFactorFormatted * 100).toFixed(2) + '%',
              supply_value_usd: supplyValueUSD.toFixed(2),
              borrow_value_usd: borrowValueUSD.toFixed(2),
              price_usd: tokenPrice.toFixed(6),
            })
          }
        }
      }

      // Calculate metrics
      const liquidityNumber = Number(liquidity)
      const shortfallNumber = Number(shortfall)
      const healthFactor = totalBorrowUSD > 0 ? (totalCollateralUSD / totalBorrowUSD) : Infinity

      // Determine account status
      const canBorrow = liquidityNumber > 0 && shortfallNumber === 0
      const atRiskLiquidation = healthFactor < 1.4
      const isHealthy = healthFactor >= 1.5
      const hasShortfall = shortfallNumber > 0

      // Calculate utilization
      const utilizationRate = totalCollateralUSD > 0 ? (totalBorrowUSD / totalCollateralUSD) * 100 : 0

      return {
        status: 'success',
        message: '✅ Account liquidity information retrieved',
        account_address: accountAddress,
        network: {
          name: 'CELO',
          chain_id: 42220,
          native_currency: 'CELO',
        },
        liquidity_info: {
          liquidity: formatUnits(liquidity, 18),
          shortfall: formatUnits(shortfall, 18),
          health_factor: healthFactor === Infinity ? '∞' : healthFactor.toFixed(2),
          can_borrow: canBorrow,
          at_risk_liquidation: atRiskLiquidation,
          is_healthy: isHealthy,
          total_collateral_usd: totalCollateralUSD.toFixed(2),
          total_borrow_usd: totalBorrowUSD.toFixed(2),
          utilization_rate: utilizationRate.toFixed(2) + '%',
        },
        positions: positions,
        risk_analysis: {
          risk_level: hasShortfall
            ? 'CRITICAL'
            : atRiskLiquidation
            ? 'HIGH'
            : healthFactor < 2.0
            ? 'MEDIUM'
            : 'LOW',
          liquidation_threshold: '1.2',
          recommended_health_factor: '1.5',
          safe_borrowing_capacity: (liquidityNumber / 1e18 * 0.8).toFixed(2), // 80% of available liquidity
        },
        recommendations: hasShortfall
          ? [
              '🚨 CRITICAL: Account has shortfall - immediate liquidation risk',
              'Repay borrowed assets immediately or supply more collateral',
              'Reduce borrowed positions to restore health',
              'Monitor closely to avoid forced liquidation',
            ]
          : atRiskLiquidation
          ? [
              '⚠️ HIGH RISK: Low health factor - close to liquidation threshold',
              'Monitor positions very closely',
              'Consider adding more collateral or repaying debt soon',
              'Avoid borrowing more assets until health improves',
            ]
          : !canBorrow
          ? [
              'ℹ️ INSUFFICIENT COLLATERAL: Cannot borrow more assets',
              'Supply more collateral to enable borrowing',
              'Current positions are safe from liquidation',
              'Consider maintaining some borrowing capacity',
            ]
          : [
              '✅ HEALTHY: Account is in good standing',
              `Can safely borrow up to $${(liquidityNumber / 1e18 * 0.8).toFixed(2)} worth of assets`,
              'Positions are safe from liquidation',
              'Consider maintaining health factor above 1.5 for safety margin',
            ],
      }
    } catch (error: any) {
      throw new Error(`Failed to get account liquidity: ${error.message}`)
    }
  },
})