 
'use strict'

import { z } from 'zod'

/** @typedef {import('../../server.js').WdkMcpServer} WdkMcpServer */

import { formatAmountFromBaseUnits, createReadContract } from './utils.js'
import { ERC20_ABI, CTOKEN_ADDRESSES, TOKEN_CONFIGS } from './config.js'

/**
 * Registers 'babyclawCheckAllowance' tool for checking token allowances.
 *
 * @param {WdkMcpServer} server - The MCP server instance.
 * @returns {void}
 */
export function babyclawCheckAllowance (server) {
  server.registerTool(
    'babyclawCheckAllowance',
    {
      title: 'Check BabyClaw Token Allowance',
      description: `Check token allowance for BabyClaw cToken contracts.

This tool retrieves the current allowance amount for a token to be used by its corresponding cToken contract. You must approve tokens before supplying them to BabyClaw. This is a read-only operation that does NOT modify the wallet or perform any transactions.

Args:
  - token (REQUIRED): Token symbol to check allowance for (CELO, BABY, or USDT)
  - address (OPTIONAL): Wallet address to check (defaults to current wallet)

Returns:
  Text format: Allowance information
  
  Structured output:
  {
    "status": "success",
    "token": "BABY",
    "allowance": "1000000000000000000000000",
    "allowance_formatted": "1000 BABY",
    "is_approved": true,
    "owner": "0x...",
    "spender": "0x..."
  }
  
Examples:
  - Use when: "What's my BABY token allowance for BabyClaw?"
  - Use when: "Do I need to approve my tokens?"
  - Use when: "How much BABY can I supply?"
  - Don't use when: You need to approve tokens (use babyclawApprove instead)

Error Handling:
  - Returns error if token is not supported
  - Returns error if RPC call fails`,

      inputSchema: z.object({
        token: z.enum(['CELO', 'BABY', 'USDT'])
          .describe('Token symbol to check allowance for'),
        address: z.string()
          .optional()
          .describe('Wallet address to check (defaults to current wallet)')
      }),
      outputSchema: z.object({
        status: z.string().describe('Status of the request'),
        token: z.string().describe('Token symbol'),
        allowance: z.string().describe('Allowance amount in base units'),
        allowance_formatted: z.string().describe('Allowance amount in human-readable format'),
        is_approved: z.boolean().describe('Whether token is approved (allowance > 0)'),
        owner: z.string().describe('Owner address'),
        spender: z.string().describe('Spender address (cToken address)')
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async ({ token, address }) => {
      try {
        const account = await server.wdk.getAccount('celo', 0)
        const ownerAddress = address || await account.getAddress()

        // Get token config and cToken address
        const tokenConfig = TOKEN_CONFIGS[token]
        const cTokenAddress = CTOKEN_ADDRESSES[token]

        if (!tokenConfig || !cTokenAddress) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Token ${token} is not supported by BabyClaw` }]
          }
        }

        // Check allowance for CELO (native token) - always approved
        if (token === 'CELO') {
          return {
            content: [{ type: 'text', text: `✅ CELO is the native token and does not require approval` }],
            structuredContent: {
              status: 'success',
              token: 'CELO',
              message: 'Native token - no approval required',
              allowance: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
              allowance_formatted: 'Unlimited',
              is_approved: true,
              owner: ownerAddress,
              spender: 'N/A (Native token)',
              token_address: tokenConfig.address,
              ctoken_address: cTokenAddress
            }
          }
        }

        // Check allowance for ERC20 tokens
        const tokenContract = createReadContract(tokenConfig.address, ERC20_ABI, account)
        const allowance = await tokenContract.allowance(ownerAddress, cTokenAddress)

        const isApproved = allowance > 0n
        const allowanceFormatted = formatAmountFromBaseUnits(allowance, tokenConfig.decimals)

        const result = {
          status: 'success',
          token: token,
          message: isApproved ? `✅ ${token} is approved for BabyClaw` : `❌ ${token} is NOT approved for BabyClaw`,
          allowance: allowance.toString(),
          allowance_formatted: allowanceFormatted + ' ' + token,
          is_approved: isApproved,
          owner: ownerAddress,
          spender: cTokenAddress,
          token_address: tokenConfig.address,
          ctoken_address: cTokenAddress,
          decimals: tokenConfig.decimals,
          recommendation: isApproved
            ? `Your ${token} allowance is sufficient. You can proceed with supplying tokens.`
            : `You need to approve ${token} before supplying to BabyClaw. Use babyclawApprove to set the allowance.`
        }

        // Format result as readable text for the agent
        const contentText = `${result.message}

Allowance Details:
- Token: ${token}
- Current Allowance: ${allowanceFormatted} ${token}
- Approved: ${isApproved ? 'Yes' : 'No'}
- Owner: ${ownerAddress}
- Spender (cToken): ${cTokenAddress}

${isApproved 
  ? '✅ Your allowance is sufficient. You can proceed with supplying tokens.'
  : '❌ You need to approve this token before supplying to BabyClaw. Use babyclawApprove to set the allowance.'}`

        return {
          content: [{ type: 'text', text: contentText }],
          structuredContent: result
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error checking token allowance: ${error.message}` }]
        }
      }
    }
  )
}