// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/BabyPriceOracle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployOracle
 * @notice Deploy BabyPriceOracle
 * @dev Usage: 
 *   forge script script/core/3-DeployOracle.s.sol --rpc-url celo_mainnet --broadcast --verify
 */
contract DeployOracle is Script {
    
    // Native token address
    address public constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploying BabyPriceOracle to Mainnet");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        
        console.log("Deployer address:", deployer);
        console.log("Block number:", block.number);
        
        // Check deployer balance
        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance / 1e18, "native tokens");
        require(balance > 0.001 ether, "Insufficient balance for deployment");
        
        // Load token addresses from deployment file 
        address babyTokenAddress = 0xE370336C3074E76163b2f9B07876d0Cb3425488D;
        address usdtAddress = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;
        require(babyTokenAddress != address(0), "BabyToken address not found");
        require(usdtAddress != address(0), "USDT address not found");
        
        console.log("Token addresses loaded:");
        console.log("  BabyToken:", babyTokenAddress);
        console.log("  USDT:", usdtAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Oracle
        BabyPriceOracle oracle = new BabyPriceOracle();
        
        // Set initial prices
        // Native token = $0.075
        oracle.setDirectPrice(
            NATIVE_TOKEN,
            0.075e18
        );
        
        // Mock USDC = $1.00 (stablecoin)
        oracle.setDirectPrice(
            usdtAddress,
            1e18
        );
        
        // BABY = $0.0000075
        oracle.setDirectPrice(
            babyTokenAddress,
            0.0000075e18
        );
        
        vm.stopBroadcast();
        
        console.log("===========================================");
        console.log("Oracle deployed successfully!");
        console.log("===========================================");
        console.log("BabyPriceOracle:", address(oracle));
        console.log("");
        console.log("Initial prices set:");
        console.log("  Native token: $0.075");
        console.log("  USDC: $1.00");
        console.log("  BABY: $0.0000075");
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