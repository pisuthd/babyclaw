# BabyClaw MCP Server

A Model Context Protocol (MCP) server for interacting with the BabyClaw lending protocol on the CELO blockchain.

## Overview

BabyClaw is a decentralized lending protocol built on CELO that allows users to:
- Supply tokens to earn interest
- Borrow tokens against collateral
- Repay borrowed tokens
- Withdraw supplied tokens
- Manage collateral positions

## Supported Tokens

- **CELO** - Native CELO token (no approval required)
- **BABY** - BabyClaw governance token
- **USDT** - Tether USD stablecoin

## Available Tools

### Read-Only Tools

#### 1. babyclawGetMarkets
Get all BabyClaw lending markets with current rates and statistics.

**Parameters:**
- `sort_by` (optional): Sort by 'supply_apy', 'borrow_apy', 'total_supply', 'total_borrows', or 'utilization_rate'
- `sort_order` (optional): 'asc' or 'desc' (default: 'desc')
- `filter_active` (optional): Show only active markets (default: true)

**Returns:** Market data including supply APY, borrow APY, utilization rates, and TVL

#### 2. babyclawGetLiquidity
Get account liquidity, health factor, and positions in BabyClaw.

**Parameters:**
- `address` (optional): Wallet address to check (defaults to current wallet)

**Returns:** Account liquidity, health factor, supply/borrow positions

#### 3. babyclawCheckAllowance
Check token allowance for BabyClaw cToken contracts.

**Parameters:**
- `token` (required): Token symbol (CELO, BABY, or USDT)
- `address` (optional): Wallet address to check (defaults to current wallet)

**Returns:** Current allowance amount and approval status

### Write Operations

#### 4. babyclawApprove
Approve a token to be used by BabyClaw.

**Parameters:**
- `token` (required): Token symbol to approve (BABY or USDT)
- `amount` (optional): Amount to approve (defaults to unlimited)
- `unlimited` (optional): Approve unlimited amount (default: true)

**Note:** CELO is native and doesn't require approval.

#### 5. babyclawEnterMarket
Enter a BabyClaw lending market to enable collateral usage.

**Parameters:**
- `token` (required): Token symbol for the market to enter (CELO, BABY, or USDT)

**Returns:** Transaction hash and collateral status

#### 6. babyclawSupply
Supply tokens to BabyClaw to earn interest.

**Parameters:**
- `token` (required): Token symbol to supply (CELO, BABY, or USDT)
- `amount` (required): Amount to supply in token units

**Returns:** Transaction hash and cTokens received

**Prerequisites:**
- BABY and USDT must be approved using `babyclawApprove` first
- CELO doesn't require approval

#### 7. babyclawBorrow
Borrow tokens from BabyClaw against your collateral.

**Parameters:**
- `token` (required): Token symbol to borrow (CELO, BABY, or USDT)
- `amount` (required): Amount to borrow in token units

**Returns:** Transaction hash and new health factor

**Prerequisites:**
- Must have sufficient collateral entered in markets
- Health factor must remain above 1.0

#### 8. babyclawRepay
Repay borrowed tokens to BabyClaw.

**Parameters:**
- `token` (required): Token symbol to repay (CELO, BABY, or USDT)
- `amount` (required): Amount to repay in token units

**Returns:** Transaction hash and new health factor

**Prerequisites:**
- BABY and USDT must be approved using `babyclawApprove` first
- CELO doesn't require approval

#### 9. babyclawWithdraw
Withdraw supplied tokens from BabyClaw.

**Parameters:**
- `token` (required): Token symbol to withdraw (CELO, BABY, or USDT)
- `amount` (required): Amount to withdraw in token units

**Returns:** Transaction hash and cTokens burned

**Note:** Cannot withdraw tokens being used as collateral unless you have sufficient excess collateral.

## Typical Workflow

### Supplying Tokens

1. Check markets: `babyclawGetMarkets`
2. (For BABY/USDT) Check allowance: `babyclawCheckAllowance`
3. (If needed) Approve tokens: `babyclawApprove`
4. Enter market (to use as collateral): `babyclawEnterMarket`
5. Supply tokens: `babyclawSupply`
6. Check position: `babyclawGetLiquidity`

### Borrowing Tokens

1. Check markets: `babyclawGetMarkets`
2. Check liquidity: `babyclawGetLiquidity`
3. Enter markets for collateral: `babyclawEnterMarket`
4. Supply collateral: `babyclawSupply`
5. Borrow tokens: `babyclawBorrow`
6. Monitor health factor: `babyclawGetLiquidity`

### Repaying Debt

1. Check current position: `babyclawGetLiquidity`
2. (For BABY/USDT) Check allowance: `babyclawCheckAllowance`
3. (If needed) Approve tokens: `babyclawApprove`
4. Repay debt: `babyclawRepay`
5. Verify health factor: `babyclawGetLiquidity`

### Withdrawing Tokens

1. Check current position: `babyclawGetLiquidity`
2. Check supply balance: `babyclawGetLiquidity`
3. Withdraw tokens: `babyclawWithdraw`
4. Verify position: `babyclawGetLiquidity`

## Health Factor

The health factor is a critical metric for borrowing:
- **Above 1.5**: Safe position
- **1.0 - 1.5**: Caution - consider adding collateral or repaying
- **Below 1.0**: Danger - position at risk of liquidation

## Important Notes

- **Gas Fees**: All write operations require CELO for gas fees
- **Token Approvals**: BABY and USDT must be approved before supplying or repaying
- **Collateral**: Tokens must be entered in markets before being used as collateral
- **Interest**: Both supplied and borrowed tokens accrue interest over time
- **Liquidation Risk**: Monitor your health factor regularly to avoid liquidation

## Configuration

The server uses the following configuration:
- **Comptroller Address**: Manages market entry and collateral
- **cToken Addresses**: CELO, BABY, USDT market contracts
- **Token Decimals**: 18 for CELO, 18 for BABY, 6 for USDT
- **Chain**: CELO (Chain ID: 42220)

## Error Handling

All tools return structured error messages with clear guidance:
- Unsupported tokens
- Insufficient balances
- Missing approvals
- Insufficient collateral
- Transaction failures
- Network issues

## Architecture

The server is built using:
- **Tether WDK**: For wallet and blockchain interactions
- **Ethers.js**: For contract interactions (via WDK provider)
- **Zod**: For schema validation
- **MCP SDK**: For tool registration and protocol compliance

## License

Copyright 2025 Tether Operations Limited

Licensed under the Apache License, Version 2.0