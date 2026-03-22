 
'use strict'

import { z } from 'zod'
import { ethers } from 'ethers'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { parseAmountToBaseUnits, formatAmountFromBaseUnits, createReadContract } from './utils.js'
import { CTOKEN_ABI, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from './config.js'

/**
 * Registers 'babyclawWithdraw' tool for withdrawing supplied tokens.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawWithdraw (server) {
  server.registerTool(
    'babyclawWithdraw',
    {
      title: 'Withdraw Tokens from BabyClaw',
      description: `Withdraw supplied tokens from BabyClaw lending protocol.

This tool withdraws tokens that you previously supplied to BabyClaw, including any earned interest. You cannot withdraw tokens if they are being used as collateral for active borrows unless you have sufficient excess collateral. This is a WRITE operation that modifies blockchain and costs gas fees.

Args:
  - token (REQUIRED): Token symbol to withdraw (CELO, BABY, or USDT)
  - amount (REQUIRED): Amount to withdraw in token units

Returns:
  Text format: Transaction confirmation
  
  Structured output:
  {
    "status": "success",
    "token": "BABY",
    "amount": "1000",
    "ctoken_burned": "995",
    "transaction_hash": "0x..."
  }
  
Examples:
  - Use when: "Withdraw 1000 BABY from BabyClaw"
  - Use when: "I want to take out my supplied CELO"
  - Use when: "Withdraw 500 USDT from the protocol"
  - Don't use when: Insufficient collateral for borrows (check with babyclawGetLiquidity first)

Error Handling:
  - Returns error if token is not supported
  - Returns error if amount exceeds supply balance
  - Returns error if insufficient collateral for active borrows
  - Returns error if transaction fails`,

      inputSchema: z.object({
        token: z.enum(['CELO', 'BABY', 'USDT'])
          .describe('Token symbol to withdraw'),
        amount: z.string()
          .describe('Amount to withdraw in token units (e.g., "1000" for 1000 tokens)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of request'),
        token: z.string().describe('Token symbol'),
        amount_withdrawn: z.string().describe('Amount withdrawn in human-readable format'),
        ctoken_burned: z.string().describe('Amount of cTokens burned'),
        transaction_hash: z.string().describe('Transaction hash'),
        market_address: z.string().describe('cToken contract address')
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

        // Check current cToken balance
        const cTokenContract = createReadContract(cTokenAddress, CTOKEN_ABI, account)
        const cTokenBalance = await cTokenContract.balanceOf(address)
        const exchangeRate = await cTokenContract.exchangeRateStored()

        // Calculate available supply in underlying tokens
        const supplyUnderlying = (cTokenBalance * exchangeRate) / 1000000000000000000n
        const supplyFormatted = formatAmountFromBaseUnits(supplyUnderlying, tokenConfig.decimals)

        if (supplyUnderlying === 0n) {
          return {
            isError: true,
            content: [{ type: 'text', text: `No ${token} supplied to BabyClaw. Current supply balance: 0 ${token}` }]
          }
        }

        // Parse amount to base units
        const amountRaw = parseAmountToBaseUnits(amount, tokenConfig.decimals)

        if (amountRaw > supplyUnderlying) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Cannot withdraw ${amount} ${token}. Maximum withdrawable: ${supplyFormatted} ${token}` }]
          }
        }

        // Create interface for encoding function call data
        const iface = new ethers.Interface(CTOKEN_ABI)

        // Send withdraw transaction
        const tx = await account.sendTransaction({
          to: cTokenAddress,
          value: 0n,
          data: iface.encodeFunctionData('redeemUnderlying', [amountRaw])
        })

        // Calculate cTokens burned
        const cTokensBurned = (amountRaw * 1000000000000000000n) / exchangeRate
        const cTokensBurnedFormatted = formatAmountFromBaseUnits(cTokensBurned, 18)

        const result = {
          status: 'success',
          message: `✅ Withdrew ${amount} ${token} from BabyClaw. Burned ${cTokensBurnedFormatted} c${token}`,
          token: token,
          amount_withdrawn: amount,
          amount_raw: amountRaw.toString(),
          ctoken_burned: cTokensBurnedFormatted,
          ctoken_raw: cTokensBurned.toString(),
          ctoken_symbol: `c${token}`,
          exchange_rate: formatAmountFromBaseUnits(exchangeRate, 18),
          previous_balance: supplyFormatted,
          transaction_hash: tx.hash.toString(),
          from: address,
          to: cTokenAddress,
          market_address: cTokenAddress,
          next_steps: [
            `You have withdrawn ${amount} ${token} including any earned interest`,
            'Your tokens are back in your wallet',
            'Check your remaining positions using babyclawGetLiquidity',
            'Supply again anytime using babyclawSupply to continue earning interest',
            'Consider leaving some supply as collateral for borrowing if needed'
          ]
        }

        // Format result as readable text for the agent
        let nextStepsText = ''
        if (result.next_steps && result.next_steps.length > 0) {
          nextStepsText = '\n' + result.next_steps.map(s => `  • ${s}`).join('\n')
        }

        const contentText = `${result.message}

Withdraw Details:
- Token: ${token}
- Amount Withdrawn: ${amount}
- cTokens Burned: ${cTokensBurnedFormatted} (c${token})
- Exchange Rate: ${formatAmountFromBaseUnits(exchangeRate, 18)}
- Previous Balance: ${supplyFormatted} ${token}
- From: ${address}
- To: ${cTokenAddress}
- Transaction: ${tx.hash}${nextStepsText}`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error withdrawing tokens: ${error.message}` }]
        }
      }
    }
  )
}