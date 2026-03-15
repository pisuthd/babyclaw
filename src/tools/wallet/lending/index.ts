/**
 * BabyClaw Lending Tools
 * 
 * This module exports all lending tools for the BabyClaw protocol on CELO chain.
 * Tools include supply, borrow, repay, withdraw, account liquidity, enter market, and token approval.
 */

import { supplyToMarketTool } from './supplyToMarket.js'
import { borrowFromMarketTool } from './borrowFromMarket.js'
import { repayBorrowTool } from './repayBorrow.js'
import { withdrawFromMarketTool } from './withdrawFromMarket.js'
import { getAccountLiquidityTool } from './getAccountLiquidity.js'
import { approveTokenTool } from './approveToken.js'
import { checkAllowanceTool } from './checkAllowance.js'
import { enterMarketTool } from './enterMarket.js'
import { getMarketsTool } from './getMarkets.js'

export { supplyToMarketTool, borrowFromMarketTool, repayBorrowTool, withdrawFromMarketTool, getAccountLiquidityTool, approveTokenTool, checkAllowanceTool, enterMarketTool, getMarketsTool }

/**
 * All lending tools array for easy import
 */
export const LENDING_TOOLS = [
  supplyToMarketTool,
  borrowFromMarketTool,
  repayBorrowTool,
  withdrawFromMarketTool,
  getAccountLiquidityTool,
  approveTokenTool,
  checkAllowanceTool,
  enterMarketTool,
  getMarketsTool,
] as const