/**
 * Tool: Get wallet information
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { getAccount, getPublicClient } from './clients.js'
import { fetchPrices, getTokenBalance, formatUSDValue } from './utils.js'
import { TOKEN_ADDRESSES, config } from './config.js'

export const getWalletInfoTool = tool({
  name: 'get_wallet_info',
  description: 'Get comprehensive wallet information including all token balances',
  inputSchema: z.object({}),
  callback: async () => {
    try {
      const account = getAccount()
      const publicClient = getPublicClient()
      const walletAddress = account.address

      // Get native CELO balance
      const nativeBalance = await publicClient.getBalance({
        address: walletAddress,
      })

      // Fetch prices
      const prices = await fetchPrices()

      // Get token balances
      const tokens = []

      // Add CELO (native)
      const celoPrice = prices['CELO'] || 0
      const celoBalanceFormatted = Number(nativeBalance) / 1e18
      const celoBalanceUSD = celoBalanceFormatted * celoPrice

      tokens.push({
        symbol: 'CELO',
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        balance: celoBalanceFormatted.toFixed(6),
        balanceUSD: formatUSDValue(celoBalanceUSD),
        price: celoPrice ? `$${celoPrice.toFixed(6)}` : 'N/A',
        decimals: 18,
      })

      // Add BABY token
      try {
        const babyResult = await getTokenBalance(TOKEN_ADDRESSES.BABY, walletAddress)
        const babyPrice = prices['BABY'] || 0
        const babyBalanceFormatted = Number(babyResult.balance) / Math.pow(10, babyResult.decimals)
        const babyBalanceUSD = babyBalanceFormatted * babyPrice

        tokens.push({
          symbol: 'BABY',
          address: TOKEN_ADDRESSES.BABY,
          balance: babyBalanceFormatted.toFixed(6),
          balanceUSD: formatUSDValue(babyBalanceUSD),
          price: babyPrice ? `$${babyPrice.toFixed(6)}` : 'N/A',
          decimals: babyResult.decimals,
        })
      } catch (error) {
        console.warn('Failed to load BABY balance:', error)
      }

      // Add USDT token
      try {
        const usdtResult = await getTokenBalance(TOKEN_ADDRESSES.USDT, walletAddress)
        const usdtPrice = prices['USDT'] || 1
        const usdtBalanceFormatted = Number(usdtResult.balance) / Math.pow(10, usdtResult.decimals)
        const usdtBalanceUSD = usdtBalanceFormatted * usdtPrice

        tokens.push({
          symbol: 'USDT',
          address: TOKEN_ADDRESSES.USDT,
          balance: usdtBalanceFormatted.toFixed(6),
          balanceUSD: formatUSDValue(usdtBalanceUSD),
          price: `$${usdtPrice.toFixed(6)}`,
          decimals: usdtResult.decimals,
        })
      } catch (error) {
        console.warn('Failed to load USDT balance:', error)
      }

      // Sort tokens by USD value (highest first)
      tokens.sort((a: any, b: any) => parseFloat(b.balanceUSD.replace('$', '')) - parseFloat(a.balanceUSD.replace('$', '')))

      // Calculate total portfolio value
      const totalPortfolioUSD = tokens.reduce(
        (sum: number, token: any) => sum + parseFloat(token.balanceUSD.replace('$', '')),
        0
      )


      return {
        status: 'success',
        address: walletAddress,
        tokens,
        totalPortfolioUSD: formatUSDValue(totalPortfolioUSD),
        network: {
          chainId: 42220,
          name: 'CELO',
          rpcUrl: config.CELO_RPC_URL,
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to get wallet info: ${error.message}`)
    }
  },
})