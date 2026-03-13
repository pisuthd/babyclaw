// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/BabyToken.sol"; 

/**
 * @title DeployTokens
 * @notice Deploy BabyToken
 * @dev Usage: 
 *   forge script script/core/1-DeployTokens.s.sol --rpc-url celo_mainnet --broadcast --verify
 */
contract DeployTokens is Script {
    
    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploying Tokens to Mainnet");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        
        console.log("Deployer address:", deployer);
        console.log("Block number:", block.number);
        
        // Check deployer balance
        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance / 1e18, "native tokens");
        require(balance > 0.01 ether, "Insufficient balance for deployment");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy BabyToken
        console.log("\n1. Deploying BabyToken...");
        BabyToken babyToken = new BabyToken(
            deployer,
            address(0) // No AI agent for now
        );
        console.log("BabyToken deployed:", address(babyToken));

        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("Tokens deployed successfully!");
        console.log("===========================================");
        console.log("BabyToken:", address(babyToken));
        console.log("Name: BabyToken");
        console.log("Symbol: BABY");
        console.log("Total Supply: 1,000,000,000 BABY");
        console.log("");
         
    }
    
    function _parsePrivateKey(string memory privateKeyString) internal pure returns (uint256) {
        if (bytes(privateKeyString)[0] == '0' && bytes(privateKeyString)[1] == 'x') {
            return vm.parseUint(privateKeyString);
        } else {
            return vm.parseUint(string(abi.encodePacked("0x", privateKeyString)));
        }
    }
}