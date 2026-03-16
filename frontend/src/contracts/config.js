/**
 * BabyClaw Lending Protocol Configuration
 * CELO chain only (no multi-chain support)
 */

import { celo } from 'wagmi/chains';

// Chain configuration
export const CHAIN = celo;
export const CHAIN_ID = 42220;

// Native token information
export const NATIVE_TOKEN = {
  symbol: 'CELO',
  name: 'CELO',
  decimals: 18,
};

// Token addresses for CELO
export const TOKEN_ADDRESSES = {
  BABY: '0xE370336C3074E76163b2f9B07876d0Cb3425488D',
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
  CELO: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
};

// Token configurations
export const TOKEN_CONFIGS = {
  CELO: { address: TOKEN_ADDRESSES.CELO, symbol: 'CELO', decimals: 18, name: 'CELO' },
  BABY: { address: TOKEN_ADDRESSES.BABY, symbol: 'BABY', decimals: 18, name: 'BabyToken' },
  USDT: { address: TOKEN_ADDRESSES.USDT, symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  "USD₮": { address: TOKEN_ADDRESSES.USDT, symbol: 'USD₮', decimals: 6, name: 'Tether USD' },
};

// BabyClaw Lending Protocol addresses (CELO chain)
export const LENDING_CONFIG = {
  COMPTROLLER: '0x790057160a6B183C80C0514f644eA6BCE9EDa0D4',
  cBABY: '0xA929c651F807F148fbdC32fFEdB43bE335A5101c',
  cCELO: '0x2591d179a0B1dB1c804210E111035a3a13c95a48',
  cUSDT: '0xCb452BcEd7f0f2d6DCDA53B2c7057048A8D54e5D',
};

// Map token symbol to cToken address
export const CTOKEN_ADDRESSES = {
  CELO: LENDING_CONFIG.cCELO,
  BABY: LENDING_CONFIG.cBABY,
  USDT: LENDING_CONFIG.cUSDT,
  "USD₮": LENDING_CONFIG.cUSDT,
};

// Comptroller address
export const COMPTROLLER_ADDRESS = LENDING_CONFIG.COMPTROLLER;

/**
 * Get Comptroller address for CELO
 */
export function getComptrollerAddress() {
  return COMPTROLLER_ADDRESS;
}

/**
 * Get cToken address for a specific token symbol
 */
export function getCTokenAddress(symbol) {
  const address = CTOKEN_ADDRESSES[symbol];
  if (!address) {
    throw new Error(`No cToken address configured for ${symbol}`);
  }
  return address;
}

/**
 * Get token configuration for a specific symbol
 */
export function getTokenConfig(symbol) {
  const config = TOKEN_CONFIGS[symbol];
  if (!config) {
    throw new Error(`No token configuration found for ${symbol}`);
  }
  return config;
}

/**
 * Get all available token symbols
 */
export function getAllTokenSymbols() {
  return Object.keys(TOKEN_CONFIGS);
}

/**
 * Get all available cToken addresses
 */
export function getAllCTokenAddresses() {
  return Object.values(CTOKEN_ADDRESSES);
}
