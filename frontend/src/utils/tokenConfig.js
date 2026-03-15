// Token configuration for BabyClaw


export const TOKEN_CONFIG = {
  CELO: {
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native token
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18,
    icon: '/celo-icon.png',
  },
  BABY: {
    address: '0xE370336C3074E76163b2f9B07876d0Cb3425488D',
    name: 'BabyClaw',
    symbol: 'BABY',
    decimals: 18,
    icon: '/babyclaw-icon.png',
  },
  USDT: {
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    name: 'Tether USD',
    symbol: 'USD₮',
    decimals: 6,
    icon: '/usdt-icon.png',
  },
};

// Token icons mapping
export const TOKEN_ICONS = {
  CELO: '/celo-icon.png',
  BABY: '/babyclaw-icon.png',
  'USD₮': '/usdt-icon.png',
  USDT: '/usdt-icon.png',
};

// Price API configuration
export const PRICE_API_CONFIG = {
  endpoint: 'https://kvxdikvk5b.execute-api.ap-southeast-1.amazonaws.com/prod/prices',
  supportedTokens: ['CELO', 'BABY', 'USDT'],
  // Map API symbols to our token symbols
  symbolMapping: {
    'CELO': 'CELO',
    'BABY': 'BABY',
    'USDT': 'USDT',
  },
};