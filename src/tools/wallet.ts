/**
 * Wallet Tools Index
 * 
 * This module exports all wallet-related tools for the BabyClaw agent.
 * Tools are organized into separate files for better maintainability.
 */

// Import all wallet tools
import { getWalletInfoTool } from './wallet/getWalletInfo.js'
import { sendNativeTokenTool } from './wallet/sendNativeToken.js'
import { sendERC20TokenTool } from './wallet/sendERC20Token.js'
import { getPricesTool } from './wallet/getPrices.js'

// Re-export individual tools
export { getWalletInfoTool, sendNativeTokenTool, sendERC20TokenTool, getPricesTool }

// Export all tools as a flat array for the agent
export const walletTools = [
  getWalletInfoTool,
  sendNativeTokenTool,
  sendERC20TokenTool,
  getPricesTool,
]
