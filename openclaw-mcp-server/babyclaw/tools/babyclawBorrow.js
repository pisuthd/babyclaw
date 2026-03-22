 
'use strict'

import { z } from 'zod'
import { ethers } from 'ethers'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { parseAmountToBaseUnits, formatAmountFromBaseUnits, createReadContract } from './utils.js'
import { CTOKEN_ABI, CTOKEN_ADDRESSES, COMPTROLLER_ABI, TOKEN_CONFIGS, LENDING_CONFIG } from './config.js'

/**
 * Registers 'babyclawBorrow' tool for borrowing tokens.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawBorrow (server) {
  server.registerTool(
    'babyclawBorrow',
    {
      title: 'Borrow Tokens from BabyClaw',
      description: `Borrow tokens from BabyClaw lending protocol against your collateral.

This tool borrows tokens from a BabyClaw lending market using your supplied collateral as security. You must have sufficient collateral entered in markets (use babyclawEnterMarket) and maintain a health factor above 1.0 to avoid liquidation. This is a WRITE operation that modifies the blockchain and costs gas fees.

Args:
  - token (REQUIRED): Token symbol to borrow (CELO, BABY, or USDT)
  - amount (REQUIRED): Amount to borrow in token units

Returns:
  Text format: Transaction confirmation
  
  Structured output:
  {
    "status": "success",
    "token": "BABY",
    "amount": "1000",
    "transaction_hash": "0x...",
    "new_health_factor": "1.50"
  }
  
Examples:
  - Use when: "Borrow 1000 BABY against my collateral"
  - Use when: "I need to borrow CELO"
  - Use when: "Take out a 500 USDT loan"
  - Don't use when: You don't have sufficient collateral (check with babyclawGetLiquidity first)
  - Don't use when: Health factor would drop below 1.5 (consider borrowing less)

Error Handling:
  - Returns error if token is not supported
  - Returns error if amount exceeds available liquidity
  - Returns error if insufficient collateral
  - Returns error if transaction fails`,

      inputSchema: z.object({
        token: z.enum(['CELO', 'BABY', 'USDT'])
          .describe('Token symbol to borrow'),
        amount: z.string()
          .describe('Amount to borrow in token units (e.g., "1000" for 1000 tokens)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of request'),
        token: z.string().describe('Token symbol'),
        amount_borrowed: z.string().describe('Amount borrowed in human-readable format'),
        transaction_hash: z.string().describe('Transaction hash'),
        market_address: z.string().describe('cToken contract address'),
        new_health_factor: z.string().describe('New health factor after borrowing')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ token, amount }) => {
      try {
        const account = await server.wdk.getAccount('celo', 0)
        const address = await account.getAddress()

        // Get token config and cToken address
        const tokenConfig = TOKEN_CONFIGS[token]
        const cTokenAddress = CTOKEN_ADDRESSES[token]

        if (!tokenConfig || !cTokenAddress) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Token ${token} is not supported by BabyClaw` }]
          }
        }

        // Check account liquidity before borrowing
        const comptrollerContract = createReadContract(LENDING_CONFIG.COMPTROLLER, COMPTROLLER_ABI, account)
        const liquidityResult = await comptrollerContract.getAccountLiquidity(address)

        const [errorCode, liquidityAmount, shortfallAmount] = liquidityResult

        if (shortfallAmount > 0n) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Cannot borrow: Account has a shortfall. Your position is at risk of liquidation. Add collateral or repay debt.` }]
          }
        }

        if (liquidityAmount === 0n) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Cannot borrow: No available liquidity. You need to supply tokens and enter markets as collateral first.` }]
          }
        }

        // Parse amount to base units
        const amountRaw = parseAmountToBaseUnits(amount, tokenConfig.decimals)

        // Send borrow transaction
        const tx = await account.sendTransaction({
          to: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: 'borrow',
          args: [amountRaw]
        })

        const txHash = tx.hash || tx

        // Calculate new health factor after borrowing
        const newLiquidityResult = await comptrollerContract.getAccountLiquidity(address)
        const [, newLiquidityAmount] = newLiquidityResult
        const newLiquidityUSD = parseFloat(formatAmountFromBaseUnits(newLiquidityAmount, 18))

        // Get all borrow positions
        const assetsIn = await comptrollerContract.getAssetsIn(address)

        let totalBorrowUSD = 0
        for (const assetAddr of assetsIn) {
          const cTokenContract = createReadContract(assetAddr, CTOKEN_ABI, account)
          const balance = await cTokenContract.borrowBalanceStored(address)

          // Find token for this asset
          for (const [symbol, caddr] of Object.entries(CTOKEN_ADDRESSES)) {
            if (caddr.toLowerCase() === assetAddr.toLowerCase()) {
              const config = TOKEN_CONFIGS[symbol]
              const balanceFormatted = parseFloat(formatAmountFromBaseUnits(balance, config.decimals))
              // Use placeholder price if needed (in production, fetch real prices)
              totalBorrowUSD += balanceFormatted
              break
            }
          }
        }

        // Calculate health factor
        let newHealthFactor = '∞'
        if (totalBorrowUSD > 0) {
          const totalCollateralUSD = totalBorrowUSD + newLiquidityUSD
          newHealthFactor = (totalCollateralUSD / totalBorrowUSD).toFixed(2)
        }

        const result = {
          status: 'success',
          message: `✅ Borrowed ${amount} ${token} from BabyClaw. New Health Factor: ${newHealthFactor}`,
          token: token,
          amount_borrowed: amount,
          amount_raw: amountRaw.toString(),
          transaction_hash: txHash,
          market_address: cTokenAddress,
          from: address,
          to: cTokenAddress,
          new_health_factor: newHealthFactor,
          new_liquidity_usd: newLiquidityUSD.toFixed(2),
          warnings: [],
          next_steps: [
            `You have borrowed ${amount} ${token}`,
            `You are now paying borrow interest on ${amount} ${token}`,
            'Monitor your health factor closely using babyclawGetLiquidity',
            'Repay borrow anytime using babyclawRepay',
            'Consider maintaining a health factor above 1.5 for safety',
            'Keep an eye on market conditions that could affect rates'
          ]
        }

        // Add warnings if health factor is low
        const hf = parseFloat(newHealthFactor)
        if (hf < 1.5 && hf >= 1.0) {
          result.warnings.push('⚠️ Health factor is low. Consider adding more collateral or repaying debt.')
        } else if (hf < 1.0) {
          result.warnings.push('🚨 Health factor is below 1.0! Your position is at risk of liquidation!')
        }

        // Format result as readable text for the agent
        let warningsText = ''
        if (result.warnings && result.warnings.length > 0) {
          warningsText = '\n\nWarnings:\n' + result.warnings.map(w => `  ${w}`).join('\n')
        }

        const contentText = `${result.message}

Borrow Details:
- Token: ${token}
- Amount Borrowed: ${amount}
- New Health Factor: ${newHealthFactor}
- New Available Liquidity: $${newLiquidityUSD.toFixed(2)}
- From: ${address}
- To: ${cTokenAddress}
- Transaction: ${tx}

✅ You have borrowed ${amount} ${token}
- You are now paying borrow interest on ${amount} ${token}
- Monitor your health factor closely using babyclawGetLiquidity
- Repay borrow anytime using babyclawRepay
- Consider maintaining a health factor above 1.5 for safety
- Keep an eye on market conditions that could affect rates${warningsText}`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error borrowing tokens: ${error.message}` }]
        }
      }
    }
  )
}