/**
 * Tool: Get all token prices
 */

import { tool } from '@strands-agents/sdk'
import { z } from 'zod'
import { fetchPrices } from './utils.js'

export const getPricesTool = tool({
  name: 'get_prices',
  description: 'Get all available token prices from the price API',
  inputSchema: z.object({}),
  callback: async () => {
    try {
      const prices = await fetchPrices()

      return {
        status: 'success',
        message: '✅ Retrieved all available token prices',
        network: {
          name: 'CELO',
          chain_id: 42220,
          native_currency: 'CELO'
        },
        prices,
        count: Object.keys(prices).length,
        timestamp: new Date().toISOString(),
        recommendations: [
          'Use these prices for portfolio valuation on CELO network',
          'Prices are updated regularly from the price API',
          'Check timestamp for price freshness'
        ]
      }
    } catch (error: any) {
      throw new Error(`Failed to get prices: ${error.message}`)
    }
  },
})