/**
 * Viem clients for blockchain interactions
 */

import {
  createPublicClient,
  createWalletClient,
  http,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { config } from './config.js'

// Lazy-load clients to ensure env vars are loaded first
let _publicClient: ReturnType<typeof createPublicClient> | null = null
let _walletClient: ReturnType<typeof createWalletClient> | null = null
let _account: ReturnType<typeof privateKeyToAccount> | null = null

function initClients() {
  if (_publicClient && _walletClient && _account) {
    return { publicClient: _publicClient, walletClient: _walletClient, account: _account }
  }

  // Format private key
  const privateKey = config.WALLET_PRIVATE_KEY
  const formattedPrivateKey = privateKey.startsWith('0x')
    ? privateKey
    : `0x${privateKey}`

  // Validate private key format
  if (!/^0x[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
    throw new Error(
      'Invalid private key format. Expected 64 hex characters (32 bytes)'
    )
  }

  _account = privateKeyToAccount(formattedPrivateKey as `0x${string}`)

  _publicClient = createPublicClient({
    chain: celo,
    transport: http(config.CELO_RPC_URL),
  }) as any

  _walletClient = createWalletClient({
    account: _account,
    chain: celo,
    transport: http(config.CELO_RPC_URL),
  })

  return { publicClient: _publicClient, walletClient: _walletClient, account: _account }
}

// Export getters for lazy initialization
export const getPublicClient = () => {
  return initClients().publicClient
}

export const getWalletClient = () => {
  return initClients().walletClient
}

export const getAccount = () => {
  return initClients().account
}