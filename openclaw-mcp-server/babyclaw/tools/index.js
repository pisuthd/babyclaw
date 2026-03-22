// Copyright 2025 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict'

/**
 * BabyClaw Lending Tools for WDK MCP
 * 
 * This module exports all BabyClaw lending protocol tools for the CELO chain.
 * These tools allow users to interact with the BabyClaw lending protocol,
 * including supplying, borrowing, repaying, withdrawing, and managing allowances.
 */

import { babyclawGetMarkets } from './babyclawGetMarkets.js'
import { babyclawGetLiquidity } from './babyclawGetLiquidity.js'
import { babyclawCheckAllowance } from './babyclawCheckAllowance.js'
import { babyclawApprove } from './babyclawApprove.js'
import { babyclawEnterMarket } from './babyclawEnterMarket.js'
import { babyclawSupply } from './babyclawSupply.js'
import { babyclawBorrow } from './babyclawBorrow.js'
import { babyclawRepay } from './babyclawRepay.js'
import { babyclawWithdraw } from './babyclawWithdraw.js'
import { babyclawBurnToken } from './babyclawBurnToken.js'

/**
 * Registers all BabyClaw lending tools with the MCP server
 *
 * @param {import('../../server.js').WdkMcpServer} server - The MCP server instance
 * @returns {void}
 */
export function registerBabyClawTools (server) {
  // READ-ONLY TOOLS
  babyclawGetMarkets(server)
  babyclawGetLiquidity(server)
  babyclawCheckAllowance(server)

  // WRITE TOOLS
  babyclawApprove(server)
  babyclawEnterMarket(server)
  babyclawSupply(server)
  babyclawBorrow(server)
  babyclawRepay(server)
  babyclawWithdraw(server)
  babyclawBurnToken(server)
}

/**
 * Individual tool exports for selective registration
 */
export {
  babyclawGetMarkets,
  babyclawGetLiquidity,
  babyclawCheckAllowance,
  babyclawApprove,
  babyclawEnterMarket,
  babyclawSupply,
  babyclawBorrow,
  babyclawRepay,
  babyclawWithdraw,
  babyclawBurnToken
}
