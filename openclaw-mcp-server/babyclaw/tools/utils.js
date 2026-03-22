 
'use strict'

import { Contract } from 'ethers'

/**
 * Returns prices for CELO, USDT, and BABY
 */
export async function fetchPrices () {
  try {
    const response = await fetch(
      'https://kvxdikvk5b.execute-api.ap-southeast-1.amazonaws.com/prod/prices'
    )
    const data = await response.json()

    const prices = {}

    if (data.success && data.data) {
      // Get CELO and USDT from API
      data.data
        .filter(price => ['CELO', 'USDT'].includes(price.symbol))
        .forEach(price => {
          prices[price.symbol] = price.price || 0
        })
    }

    // Add hardcoded BABY price for now
    prices.BABY = 0.0000075

    return prices
  } catch (error) {
    console.warn('Failed to fetch prices:', error)
    // Return hardcoded BABY price even on API failure
    return {
      BABY: 0.0000075
    }
  }
}

/**
 * Parse amount from human-readable string to base units (bigint)
 * @param {string} amount - Human-readable amount (e.g., "100.5")
 * @param {number} decimals - Token decimals (e.g., 18)
 * @returns {bigint} Amount in base units
 */
export function parseAmountToBaseUnits (amount, decimals) {
  const parts = amount.split('.')
  if (parts.length === 1) {
    return BigInt(parts[0]) * BigInt(10 ** decimals)
  }

  const whole = parts[0] || '0'
  const fractional = parts[1] || ''

  if (fractional.length > decimals) {
    throw new Error(`Amount ${amount} exceeds precision for ${decimals} decimals`)
  }

  const wholeUnits = BigInt(whole) * BigInt(10 ** decimals)
  const fractionalUnits = BigInt(fractional.padEnd(decimals, '0'))

  return wholeUnits + fractionalUnits
}

/**
 * Format amount from base units to human-readable string
 * @param {bigint} amount - Amount in base units
 * @param {number} decimals - Token decimals
 * @returns {string} Human-readable amount
 */
export function formatAmountFromBaseUnits (amount, decimals) {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const fractional = amount % divisor

  if (fractional === 0n) {
    return whole.toString()
  }

  const fractionalStr = fractional.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole.toString()}.${fractionalStr}`
}

/**
 * Create a read-only contract instance using ethers.js
 * @param {string} address - Contract address
 * @param {Array} abi - Contract ABI
 * @param {Object} account - WDK account instance with _provider
 * @returns {Contract} Ethers.js Contract instance
 */
export function createReadContract (address, abi, account) {
  if (!account._provider) {
    throw new Error('The wallet must be connected to a provider to read contracts.')
  }
  return new Contract(address, abi, account._provider)
}

/**
 * Encode a write transaction for sending via account.sendTransaction()
 * @param {Contract} contract - Contract instance
 * @param {string} functionName - Name of the function to call
 * @param {Array} args - Arguments to pass to the function
 * @param {bigint} [value=0n] - Native token value to send (default: 0)
 * @returns {Object} Transaction object with to, value, and data
 */
export function encodeWriteTransaction (contract, functionName, args, value = 0n) {
  // Get contract address from contract instance
  const address = typeof contract.target === 'string' ? contract.target : contract.address
  
  return {
    to: address,
    value: value,
    data: contract.interface.encodeFunctionData(functionName, args)
  }
}
