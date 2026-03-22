# BabyClaw — Autonomous DeFi Bank Powered by BABY

BabyClaw is an autonomous money market that optimizes capital utilization through agent-driven execution. Instead of idle liquidity, **BABY** continuously monitors markets, borrows excess capital, and deploys it into higher-yield strategies across chains before settling profits back on-chain.

Built on Celo with a fork of Compound V2, BabyClaw uses OpenClaw for decision-making and WDK as a unified **wallet + execution environment**. WDK enables BABY to sign transactions, execute DeFi actions, and run custom MCP tools within the same runtime — allowing seamless interaction with external protocols like Aave and cross-chain bridges. Profits are converted into $BABY and burned, enforcing a deflationary economic loop.

## Key Features

- **Autonomous Agent Execution (OpenClaw)** — BABY continuously monitors markets, makes decisions, and executes yield strategies in real time, with **Discord** as the primary interface for interaction and live agent updates

- **Programmable Wallet + Execution Layer (WDK + MCP Toolkit)** — BABY operates through a self-custodial wallet that can sign transactions and run custom MCP tools to interact directly with BabyClaw contracts (borrow, supply)

- **Battle-Tested Money Market (Compound V2)** — Built on a proven lending architecture, enabling secure collateralization, borrowing, and interest rate mechanics

- **Live on Celo Mainnet** — Deployed on Celo for fast, low-cost transactions with real on-chain execution and verifiable agent activity

## Project Structure

```
/contracts              → On-chain lending protocol (Celo)
/openclaw-workspace     → OpenClaw workspace (AGENT.md, ...)
/openclaw-mcp-server   →  WCP MCP Toolkit + Custom Tools
/frontend               → React Frontend 
```

**Runtime:** OpenClaw agent runs on AWS Lightsail, enabling continuous 24/7 monitoring and autonomous execution of on-chain strategies.

## System Overview

### Agent Layer (OpenClaw + MCP)

**BABY** operates inside OpenClaw and uses mcporter (MCP bridge) to access tools from the `babyclaw-mcp-server`. Through this setup, the agent can:

- Monitor market conditions (utilization, rates, prices)
- Decide profitable strategies
- Execute actions like supply, borrow, repay, swap, and bridge

All tool executions are powered by WDK, which acts as a self-custodial wallet and execution runtime using a secure `WDK_SEED`.

### Execution Layer (WDK + MCP Tools)

The `babyclaw-mcp-server` exposes structured tools that BABY can call in natural language or programmatically, enabling full end-to-end execution of DeFi strategies.

**WDK (out-of-the-box tools):**
- @tetherto/wdk-wallet-evm — wallet operations (balance, address, transfers)
- @tetherto/wdk-protocol-bridge-usdt0-evm — cross-chain bridging
- @tetherto/wdk-protocol-lending-aave-evm — lending and borrowing on Aave

**Custom Tools (BabyClaw):**
- Lending actions: supply, borrow, repay, withdraw, liquidity management
- Token operations: approvals, transfers
- Protocol-specific interactions with BabyClaw contracts

All tools are executed through WDK, which acts as both the self-custodial wallet and execution runtime for the agent.

> For full autonomy, write operations bypass manual confirmation (e.g., elicitInput).

## How It Works 

BABY runs a continuous capital optimization loop: 
1. **Observe**
- Read BabyClaw utilization & rates
- Detect inefficiencies
2. **Decide**
- Compare borrow cost vs external yield
- Confirm profitability 
3. **Execute**
- Borrow USDT using $BABY as collateral
- Deploy capital to external markets
4. **Settle**
- Withdraw funds + yield
- Repay loan
5. **Burn**
- Convert profit → $BABY
- Execute on-chain burn

**Current Active Strategy:** 

Supply $BABY (collateral, 15%) > Borrow USDT from BabyClaw (~0.92%) > Deploy to Aave (~1.8% supply APY) > Earn yield > Repay loan > Profit → buy $BABY → burn

## 🚀 Deployment (Celo Mainnet)

### Core Contracts

| Component     | Address | Link |
|--------------|--------|------|
| Comptroller  | `0x790057160a6B183C80C0514f644eA6BCE9EDa0D4` | https://celoscan.io/address/0x790057160a6B183C80C0514f644eA6BCE9EDa0D4 |
| $BABY Token  | `0xE370336C3074E76163b2f9B07876d0Cb3425488D` | https://celoscan.io/address/0xE370336C3074E76163b2f9B07876d0Cb3425488D |

---

### Markets

| Market | Address | Link |
|--------|--------|------|
| cUSDT  | `0xCb452BcEd7f0f2d6DCDA53B2c7057048A8D54e5D` | https://celoscan.io/address/0xCb452BcEd7f0f2d6DCDA53B2c7057048A8D54e5D |
| cBABY  | `0xA929c651F807F148fbdC32fFEdB43bE335A5101c` | https://celoscan.io/address/0xA929c651F807F148fbdC32fFEdB43bE335A5101c |
| cCELO  | `0x2591d179a0B1dB1c804210E111035a3a13c95a48` | https://celoscan.io/address/0x2591d179a0B1dB1c804210E111035a3a13c95a48 |

---

### BABY Agent

| Component     | Address | Link |
|--------------|--------|------|
| Agent Wallet | `0x7652252b20176B2a23Ed6361443520195E860196` | https://celoscan.io/address/0x7652252b20176B2a23Ed6361443520195E860196 |

## License

MIT License - see LICENSE file for details
