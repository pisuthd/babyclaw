/**
 * Wallet configuration and constants for CELO chain
 */

import { type Address } from 'viem'

// Environment variables (accessed lazily)
export const getCELO_RPC_URL = () => process.env.CELO_RPC_URL || 'https://celo.drpc.org'

export const getWalletPrivateKey = () => {
  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('WALLET_PRIVATE_KEY environment variable is required')
  }
  return privateKey
}

// Token addresses for CELO
export const TOKEN_ADDRESSES = {
  BABY: '0xE370336C3074E76163b2f9B07876d0Cb3425488D' as Address,
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as Address,
} as const

export const TOKEN_CONFIGS = {
  BABY: { address: TOKEN_ADDRESSES.BABY, symbol: 'BABY', decimals: 18 },
  USDT: { address: TOKEN_ADDRESSES.USDT, symbol: 'USDT', decimals: 6 },
  CELO: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, symbol: 'CELO', decimals: 18 },
} as const

// ERC20 ABI
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

// Export configuration (lazy)
export const config = {
  get CELO_RPC_URL() {
    return getCELO_RPC_URL()
  },
  get WALLET_PRIVATE_KEY() {
    return getWalletPrivateKey()
  },
}