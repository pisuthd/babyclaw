// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/BabyToken.sol";
import "../../src/utils/MockToken.sol";

/**
 * @title DeployTokens
 * @notice Deploy BabyToken and mock USDC token for testnet
 * @dev Usage: 
 *   forge script script/core/1-DeployTokens.s.sol --rpc-url <your-rpc> --broadcast --verify
 */
contract DeployTokens is Script {
    
    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploying Tokens to Testnet");
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
        
        // 2. Deploy Mock USDC
        console.log("\n2. Deploying Mock USDC...");
        MockToken usdc = new MockToken(
            "USD Coin",
            "USDC",
            6,
            1_000_000 * 1e6 // 1 million initial supply
        );
        console.log("Mock USDC deployed:", address(usdc));
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("Tokens deployed successfully!");
        console.log("===========================================");
        console.log("BabyToken:", address(babyToken));
        console.log("Name: BabyToken");
        console.log("Symbol: BABY");
        console.log("Total Supply: 1,000,000,000 BABY");
        console.log("");
        console.log("Mock USDC:", address(usdc));
        console.log("Name: USD Coin");
        console.log("Symbol: USDC");
        console.log("Decimals: 6");
        console.log("Total Supply: 1,000,000 USDC");
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