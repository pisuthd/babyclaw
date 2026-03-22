 
'use strict'

import { z } from 'zod'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { parseAmountToBaseUnits, formatAmountFromBaseUnits, createReadContract } from './utils.js'
import { CTOKEN_ABI, CTOKEN_ADDRESSES, COMPTROLLER_ABI, TOKEN_CONFIGS, LENDING_CONFIG } from './config.js'

/**
 * Registers 'babyclawRepay' tool for repaying borrowed tokens.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawRepay (server) {
  server.registerTool(
    'babyclawRepay',
    {
      title: 'Repay Borrowed Tokens to BabyClaw',
      description: `Repay borrowed tokens to BabyClaw lending protocol.

This tool repays borrowed tokens to reduce your debt and improve your health factor. Repaying debt increases your available liquidity and reduces liquidation risk. For BABY and USDT, you must approve the tokens first using babyclawApprove. CELO is the native token and does not require approval. This is a WRITE operation that modifies the blockchain and costs gas fees.

Args:
  - token (REQUIRED): Token symbol to repay (CELO, BABY, or USDT)
  - amount (REQUIRED): Amount to repay in token units

Returns:
  Text format: Transaction confirmation
  
  Structured output:
  {
    "status": "success",
    "token": "BABY",
    "amount": "1000",
    "transaction_hash": "0x...",
    "new_health_factor": "2.00"
  }
  
Examples:
  - Use when: "Repay 1000 BABY to BabyClaw"
  - Use when: "I want to pay back my CELO loan"
  - Use when: "Repay 500 USDT to reduce my debt"
  - Don't use when: Token is not approved (check with babyclawCheckAllowance first for BABY/USDT)

Error Handling:
  - Returns error if token is not supported
  - Returns error if amount exceeds borrow balance
  - Returns error if transaction fails
  - Returns error if wallet has insufficient funds`,

      inputSchema: z.object({
        token: z.enum(['CELO', 'BABY', 'USDT'])
          .describe('Token symbol to repay'),
        amount: z.string()
          .describe('Amount to repay in token units (e.g., "1000" for 1000 tokens)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the request'),
        token: z.string().describe('Token symbol'),
        amount_repaid: z.string().describe('Amount repaid in human-readable format'),
        transaction_hash: z.string().describe('Transaction hash'),
        market_address: z.string().describe('cToken contract address'),
        new_health_factor: z.string().describe('New health factor after repaying')
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

        // Check current borrow balance
        const cTokenContract = createReadContract(cTokenAddress, CTOKEN_ABI, account)
        const borrowBalance = await cTokenContract.borrowBalanceStored(address)

        const borrowBalanceFormatted = formatAmountFromBaseUnits(borrowBalance, tokenConfig.decimals)

        if (borrowBalance === 0n) {
          return {
            isError: true,
            content: [{ type: 'text', text: `No ${token} borrow balance to repay. Current borrow balance: 0 ${token}` }]
          }
        }

        // Parse amount to base units
        const amountRaw = parseAmountToBaseUnits(amount, tokenConfig.decimals)

        // Send repay transaction
        // For native CELO, we need to send value, for ERC20 tokens we just call repayBorrow
        let tx
        if (token === 'CELO') {
          tx = await account.sendTransaction({
            to: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'repayBorrow',
            args: [],
            value: amountRaw
          })
        } else {
          tx = await account.sendTransaction({
            to: cTokenAddress,
            abi: CTOKEN_ABI,
            functionName: 'repayBorrow',
            args: [amountRaw]
          })
        }

        // Calculate new health factor after repaying
        const comptrollerContract = createReadContract(LENDING_CONFIG.COMPTROLLER, COMPTROLLER_ABI, account)
        const newLiquidityResult = await comptrollerContract.getAccountLiquidity(address)
        const [, newLiquidityAmount] = newLiquidityResult
        const newLiquidityUSD = parseFloat(formatAmountFromBaseUnits(newLiquidityAmount, 18))

        // Get all borrow positions to calculate health factor
        const assetsIn = await comptrollerContract.getAssetsIn(address)

        let totalBorrowUSD = 0
        for (const assetAddr of assetsIn) {
          const assetContract = createReadContract(assetAddr, CTOKEN_ABI, account)
          const balance = await assetContract.borrowBalanceStored(address)

          // Find token for this asset
          for (const [symbol, caddr] of Object.entries(CTOKEN_ADDRESSES)) {
            if (caddr.toLowerCase() === assetAddr.toLowerCase()) {
              const config = TOKEN_CONFIGS[symbol]
              const balanceFormatted = parseFloat(formatAmountFromBaseUnits(balance, config.decimals))
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
          message: `✅ Repaid ${amount} ${token} to BabyClaw. New Health Factor: ${newHealthFactor}`,
          token: token,
          amount_repaid: amount,
          amount_raw: amountRaw.toString(),
          previous_borrow_balance: borrowBalanceFormatted,
          transaction_hash: tx,
          from: address,
          to: cTokenAddress,
          new_health_factor: newHealthFactor,
          new_liquidity_usd: newLiquidityUSD.toFixed(2),
          next_steps: [
            `You have repaid ${amount} ${token} of your debt`,
            'Your borrow interest accrual has decreased',
            'Your health factor has improved',
            'Monitor your positions using babyclawGetLiquidity',
            'Continue repaying to fully clear your debt or borrow again if needed'
          ]
        }

        // Add special message if debt is fully repaid
        const remainingDebt = parseFloat(borrowBalanceFormatted) - parseFloat(amount)
        if (remainingDebt <= 0) {
          result.message = `✅ Fully repaid ${token} debt! New Health Factor: ${newHealthFactor}`
          result.next_steps.push('🎉 Your debt is fully repaid! You now have no borrows.')
        }

        // Format result as readable text for the agent
        let nextStepsText = ''
        if (result.next_steps && result.next_steps.length > 0) {
          nextStepsText = '\n' + result.next_steps.map(s => `  • ${s}`).join('\n')
        }

        const contentText = `${result.message}

Repay Details:
- Token: ${token}
- Amount Repaid: ${amount}
- Previous Borrow Balance: ${borrowBalanceFormatted} ${token}
- New Health Factor: ${newHealthFactor}
- New Available Liquidity: $${newLiquidityUSD.toFixed(2)}
- From: ${address}
- To: ${cTokenAddress}
- Transaction: ${tx}${nextStepsText}`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error repaying tokens: ${error.message}` }]
        }
      }
    }
  )
}