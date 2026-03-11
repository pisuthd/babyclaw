// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/BabyPriceOracle.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployOracle
 * @notice Deploy BabyPriceOracle for testnet with mock USDC
 * @dev Usage: 
 *   forge script script/core/3-DeployOracle.s.sol --rpc-url celo_sepolia --broadcast --verify
 */
contract DeployOracle is Script {
    
    // Native token address (CELO/ETH/etc.)
    address public constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploying BabyPriceOracle to Testnet");
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
        address usdcAddress = 0x999B1A634796d4a94ff4223537d47979a4C07624;
        require(babyTokenAddress != address(0), "BabyToken address not found");
        require(usdcAddress != address(0), "USDC address not found");
        
        console.log("Token addresses loaded:");
        console.log("  BabyToken:", babyTokenAddress);
        console.log("  USDC:", usdcAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Oracle
        BabyPriceOracle oracle = new BabyPriceOracle();
        
        // Set initial prices for testnet
        // Native token = $0.50 (for testing)
        oracle.setDirectPrice(
            NATIVE_TOKEN,
            0.075e18
        );
        
        // Mock USDC = $1.00 (stablecoin)
        oracle.setDirectPrice(
            usdcAddress,
            1e18
        );
        
        // BABY = $0.0001
        oracle.setDirectPrice(
            babyTokenAddress,
            0.0001e18
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
        console.log("  BABY: $0.0001");
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