/**
 * Utility functions for wallet operations
 */

import { type Address, formatUnits } from 'viem'
import { celo } from 'viem/chains'
import { ERC20_ABI } from './config.js'
import { getPublicClient } from './clients.js'

/**
 * Fetch token prices from the price API
 * Returns prices for CELO, USDT, and BABY 
 */
export async function fetchPrices(): Promise<Record<string, number>> {
  try {
    const response = await fetch(
      'https://kvxdikvk5b.execute-api.ap-southeast-1.amazonaws.com/prod/prices'
    )
    const data = await response.json()
    
    const prices: Record<string, number> = {}
    
    if (data.success && data.data) {
      // Get CELO and USDT from API
      data.data
        .filter((price: any) => ['CELO', 'USDT'].includes(price.symbol))
        .forEach((price: any) => {
          prices[price.symbol] = price.price || 0
        })
    }
    
    // Add hardcoded BABY price for now
    prices['BABY'] = 0.0000075
    
    
    return prices
  } catch (error) {
    console.warn('Failed to fetch prices:', error)
    // Return hardcoded BABY price even on API failure
    return {
      'BABY': 0.0000075
    }
  }
}

/**
 * Get token balance for a specific token
 */
export async function getTokenBalance(
  tokenAddress: Address,
  walletAddress: Address
): Promise<{ balance: bigint; decimals: number }> {
  try {
    const publicClient = getPublicClient()
    const [balance, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
        chain: celo,
      } as any),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
        chain: celo,
      } as any),
    ])

    return {
      balance: balance as bigint,
      decimals: decimals as number,
    }
  } catch (error: any) {
    throw new Error(`Failed to get token balance: ${error.message}`)
  }
}

/**
 * Format token amount to human-readable string
 */
export function formatTokenAmount(amount: bigint, decimals: number, symbol: string): string {
  const formatted = formatUnits(amount, decimals)
  return `${formatted} ${symbol}`
}

/**
 * Format USD value
 */
export function formatUSDValue(value: number): string {
  return `$${value.toFixed(2)}`
}