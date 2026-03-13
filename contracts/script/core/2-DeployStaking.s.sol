// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/BabyStaking.sol";

/**
 * @title DeployStaking
 * @notice Deploy BabyStaking for Celo Mainnet
 * @dev Usage: 
 *   forge script script/core/2-DeployStaking.s.sol --rpc-url celo_mainnet --broadcast --verify
 * 
 * Prerequisites:
 *   1. BabyToken must be deployed first (run 1-DeployBabyToken.s.sol)
 *   2. Set BABY_TOKEN environment variable with the deployed BabyToken address
 */
contract DeployStaking is Script {
    
    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploying BabyStaking to Celo Mainnet");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        require(block.chainid == 42220, "Must deploy to Celo (chain ID 42220)");
        
        console.log("Deployer address:", deployer);
        console.log("Block number:", block.number);
        
        // Check deployer balance
        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance / 1e18, "CELO");
        require(balance > 0.01 ether, "Insufficient balance for deployment (need at least 0.01 CELO)");
        
        // Get BabyToken address from environment or read from deployment file
        address babyTokenAddress = 0xE370336C3074E76163b2f9B07876d0Cb3425488D;
        require(babyTokenAddress != address(0), "BABY_TOKEN address not set");
        console.log("BabyToken address:", babyTokenAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy BabyStaking
        // Constructor: babyToken, admin (deployer)
        BabyStaking babyStaking = new BabyStaking(
            babyTokenAddress,
            deployer
        );
        
        vm.stopBroadcast();
        
        console.log("===========================================");
        console.log("BabyStaking deployed successfully!");
        console.log("===========================================");
        console.log("BabyStaking:", address(babyStaking));
        console.log("BabyToken:", babyTokenAddress);
        console.log("Admin:", deployer);
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