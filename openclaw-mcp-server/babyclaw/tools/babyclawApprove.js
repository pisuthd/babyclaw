 
'use strict'

import { z } from 'zod'
import { Contract, ethers } from 'ethers'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { parseAmountToBaseUnits, formatAmountFromBaseUnits, createReadContract, encodeWriteTransaction } from './utils.js'
import { ERC20_ABI, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from './config.js'

// Maximum uint256 value for unlimited approval
const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n

/**
 * Registers 'babyclawApprove' tool for approving tokens.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawApprove (server) {
  server.registerTool(
    'babyclawApprove',
    {
      title: 'Approve Token for BabyClaw',
      description: `Approve a token to be used by BabyClaw lending protocol.

This tool approves a token to be used by its corresponding cToken contract, allowing the protocol to transfer your tokens. You must approve tokens before supplying them to BabyClaw. CELO is the native token and does not require approval. This is a WRITE operation that modifies the blockchain and costs gas fees.

Args:
  - token (REQUIRED): Token symbol to approve (BABY or USDT)
  - amount (OPTIONAL): Amount to approve in token units (defaults to unlimited)
  - unlimited (OPTIONAL): Approve unlimited amount (default: true)

Returns:
  Text format: Transaction confirmation
  
  Structured output:
  {
    "status": "success",
    "token": "BABY",
    "amount": "1000",
    "spender": "0x...",
    "transaction_hash": "0x..."
  }
  
Examples:
  - Use when: "Approve my BABY tokens for BabyClaw"
  - Use when: "I need to approve 500 BABY"
  - Use when: "Approve USDT for supplying"
  - Don't use when: Token is already approved (check with babyclawCheckAllowance first)
  - Don't use when: Token is CELO (native token doesn't need approval)

Error Handling:
  - Returns error if token is CELO (native token)
  - Returns error if transaction fails
  - Returns error if wallet has insufficient funds for gas`,

      inputSchema: z.object({
        token: z.enum(['BABY', 'USDT'])
          .describe('Token symbol to approve (CELO is native and does not require approval)'),
        amount: z.string()
          .optional()
          .describe('Amount to approve in token units (defaults to unlimited)'),
        unlimited: z.boolean()
          .optional()
          .default(true)
          .describe('Approve unlimited amount (optional, default: true)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the request'),
        token: z.string().describe('Token symbol'),
        amount_approved: z.string().describe('Amount approved in human-readable format'),
        amount_raw: z.string().describe('Amount approved in base units'),
        spender: z.string().describe('Spender address (cToken address)'),
        transaction_hash: z.string().describe('Transaction hash')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ token, amount, unlimited }) => {
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

        // Calculate approval amount
        let approveAmount
        let approveAmountRaw

        if (unlimited) {
          approveAmountRaw = MAX_UINT256
          approveAmount = 'Unlimited'
        } else {
          if (!amount) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Amount is required when unlimited is false' }]
            }
          }
          approveAmountRaw = parseAmountToBaseUnits(amount, tokenConfig.decimals)
          approveAmount = amount
        }

        // Create interface for encoding function call data
        const iface = new ethers.Interface(ERC20_ABI)
        
        // Encode the approval transaction
        const tx = {
          to: tokenConfig.address,
          value: 0n,
          data: iface.encodeFunctionData('approve', [cTokenAddress, approveAmountRaw])
        }
        
        // Send approval transaction
        const hash = await account.sendTransaction(tx)

        const result = {
          status: 'success',
          message: `✅ Approved ${approveAmount} ${token} for BabyClaw`,
          token: token,
          amount_approved: approveAmount,
          amount_raw: approveAmountRaw.toString(),
          spender: cTokenAddress,
          spender_name: `c${token}`,
          transaction_hash: hash.hash.toString(),
          from: address,
          to: tokenConfig.address,
          unlimited: unlimited,
          next_steps: [
            'Your tokens are now approved for BabyClaw',
            'You can now supply tokens using babyclawSupply',
            'You may want to enter the market first using babyclawEnterMarket to use tokens as collateral'
          ]
        }

        // Format result as readable text for the agent
        const contentText = `${result.message}

Approval Details:
- Token: ${token}
- Amount Approved: ${approveAmount}
- Spender: ${cTokenAddress} (c${token})
- From: ${address}
- Transaction: ${hash.hash.toString()}

✅ Your tokens are now approved for BabyClaw
- You can now supply tokens using babyclawSupply
- You may want to enter the market first using babyclawEnterMarket to use tokens as collateral`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error approving token: ${error.message}` }]
        }
      }
    }
  )
}