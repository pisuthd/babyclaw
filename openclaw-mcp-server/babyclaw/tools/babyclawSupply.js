 
'use strict'

import { z } from 'zod'
import { ethers } from 'ethers'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { parseAmountToBaseUnits, formatAmountFromBaseUnits, createReadContract } from './utils.js'
import { CTOKEN_ABI, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from './config.js'

/**
 * Registers 'babyclawSupply' tool for supplying tokens.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawSupply (server) {
  server.registerTool(
    'babyclawSupply',
    {
      title: 'Supply Tokens to BabyClaw',
      description: `Supply tokens to BabyClaw lending protocol to earn interest.

This tool supplies tokens to a BabyClaw lending market, allowing you to earn supply APY on your assets. For BABY and USDT, you must approve the tokens first using babyclawApprove. CELO is the native token and does not require approval. This is a WRITE operation that modifies the blockchain and costs gas fees.

Args:
  - token (REQUIRED): Token symbol to supply (CELO, BABY, or USDT)
  - amount (REQUIRED): Amount to supply in token units

Returns:
  Text format: Transaction confirmation
  
  Structured output:
  {
    "status": "success",
    "token": "BABY",
    "amount": "1000",
    "ctoken_received": "995",
    "transaction_hash": "0x..."
  }
  
Examples:
  - Use when: "Supply 1000 BABY to BabyClaw"
  - Use when: "I want to earn interest on my CELO"
  - Use when: "Deposit 500 USDT to the lending protocol"
  - Don't use when: Token is not approved (check with babyclawCheckAllowance first for BABY/USDT)

Error Handling:
  - Returns error if token is not supported
  - Returns error if amount is invalid
  - Returns error if transaction fails
  - Returns error if wallet has insufficient funds`,

      inputSchema: z.object({
        token: z.enum(['CELO', 'BABY', 'USDT'])
          .describe('Token symbol to supply'),
        amount: z.string()
          .describe('Amount to supply in token units (e.g., "1000" for 1000 tokens)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the request'),
        token: z.string().describe('Token symbol'),
        amount_supplied: z.string().describe('Amount supplied in human-readable format'),
        ctoken_received: z.string().describe('Amount of cTokens received'),
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

        // Parse amount to base units
        const amountRaw = parseAmountToBaseUnits(amount, tokenConfig.decimals)

        // Create interface for encoding function call data
        const iface = new ethers.Interface(CTOKEN_ABI)
        
        // Send mint transaction to supply tokens
        // For native CELO, we need to send value, for ERC20 tokens we just call mint
        let tx
        if (token === 'CELO') {
          tx = await account.sendTransaction({
            to: cTokenAddress,
            value: amountRaw,
            data: iface.encodeFunctionData('mint', [])
          })
        } else {
          tx = await account.sendTransaction({
            to: cTokenAddress,
            value: 0n,
            data: iface.encodeFunctionData('mint', [amountRaw])
          })
        }

        // Get exchange rate to calculate cTokens received
        const cTokenContract = createReadContract(cTokenAddress, CTOKEN_ABI, account)
        const exchangeRate = await cTokenContract.exchangeRateStored()

        // Calculate cTokens received (1e18 precision)
        const cTokensReceived = (amountRaw * 1000000000000000000n) / exchangeRate
        const cTokensFormatted = formatAmountFromBaseUnits(cTokensReceived, 18)

        const result = {
          status: 'success',
          message: `✅ Supplied ${amount} ${token} to BabyClaw. Received ${cTokensFormatted} c${token}`,
          token: token,
          amount_supplied: amount,
          ctoken_received: cTokensFormatted,
          transaction_hash: typeof tx === 'string' ? tx : (tx.hash || tx.toString()),
          market_address: cTokenAddress
        }

        // Format result as readable text for the agent
        let warningsText = ''
        if (result.warnings && result.warnings.length > 0) {
          warningsText = '\n\nWarnings:\n' + result.warnings.map(w => `  ${w}`).join('\n')
        }

        const contentText = `${result.message}

Supply Details:
- Token: ${token}
- Amount Supplied: ${amount}
- cTokens Received: ${cTokensFormatted} (c${token})
- Exchange Rate: ${formatAmountFromBaseUnits(exchangeRate, 18)}
- From: ${address}
- To: ${cTokenAddress}
- Transaction: ${tx.hash}

✅ You are now earning supply interest on ${amount} ${token}
- Check your current APY using babyclawGetMarkets
- Use babyclawEnterMarket to enable your tokens as collateral for borrowing
- Monitor your positions using babyclawGetLiquidity
- Withdraw anytime using babyclawWithdraw${warningsText}`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error supplying tokens: ${error.message}` }]
        }
      }
    }
  )
}