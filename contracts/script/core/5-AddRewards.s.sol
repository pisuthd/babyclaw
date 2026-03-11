// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/BabyStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AddRewards
 * @notice Add BABY tokens to the BabyStaking reward pool
 * @dev Usage: 
 *   forge script script/core/5-AddRewards.s.sol --rpc-url celo_sepolia --broadcast --verify
 * 
 * Prerequisites:
 *   1. BabyToken must be deployed (run 1-DeployTokens.s.sol)
 *   2. BabyStaking must be deployed (run 2-DeployStaking.s.sol)
 *   3. Deployer must have BABY tokens to fund the reward pool
 * 
 * Environment Variables (optional):
 *   REWARD_AMOUNT - Amount of BABY tokens to add (default: 10,000,000 BABY)
 *   REWARD_DURATION - Duration in seconds (default: 1 year = 365 days)
 */
contract AddRewards is Script {
    
    // Default reward: 10 million BABY tokens
    uint256 public constant DEFAULT_REWARD_AMOUNT = 10_000_000 * 1e18;
    
    // Default duration: 1 year
    uint256 public constant DEFAULT_REWARD_DURATION = 365 days;
    
    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Adding Rewards to BabyStaking");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer address:", deployer);
        console.log("Block number:", block.number);
        
        // Load contract addresses
        address babyTokenAddress = 0xE370336C3074E76163b2f9B07876d0Cb3425488D;
        address babyStakingAddress = 0xaB0f04EF204Db673DDf6A075129d8C2B7f85caAE;
        
        console.log("\nLoaded addresses:");
        console.log("  BabyToken:", babyTokenAddress);
        console.log("  BabyStaking:", babyStakingAddress);
        
        // Get reward parameters (with defaults)
        uint256 rewardAmount = DEFAULT_REWARD_AMOUNT;
        uint256 rewardDuration = DEFAULT_REWARD_DURATION;
        
        console.log("\nReward parameters:"); 
        console.log(rewardAmount);
        console.log("  Amount:", rewardAmount / 1e18, "BABY tokens");
        console.log("  Duration:", rewardDuration / 86400, "days");
        
        // Check deployer's BABY balance
        IERC20 babyToken = IERC20(babyTokenAddress); 
        uint256 deployerBalance = babyToken.balanceOf(deployer); 
        console.log("\nDeployer BABY balance:", deployerBalance);
        require(deployerBalance >= rewardAmount, "Insufficient BABY balance to fund rewards");
        
        // Get current BabyStaking state
        BabyStaking babyStaking = BabyStaking(babyStakingAddress);
        uint256 currentRewardPool = babyStaking.getTotalRewardPool();
        uint256 currentRewardRate = babyStaking.getRewardRate();
        uint256 remainingRewards = babyStaking.getRemainingRewards();
        uint256 currentDuration = babyStaking.getRewardsDuration();
        
        console.log("\nCurrent BabyStaking state:");
        console.log("  Total Reward Pool:", currentRewardPool / 1e18, "BABY");
        console.log("  Current Reward Rate:", currentRewardRate, "per second");
        console.log("  Remaining Rewards:", remainingRewards / 1e18, "BABY");
        console.log("  Current Duration:", currentDuration / 86400, "days");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Approve BabyStaking to spend BABY tokens
        console.log("\nApproving BabyStaking contract...");
        babyToken.approve(babyStakingAddress, rewardAmount);
        console.log("  Approved:", rewardAmount / 1e18, "BABY");
        
        // Add rewards
        console.log("\nAdding rewards to BabyStaking...");
        babyStaking.addRewards(rewardAmount, rewardDuration);
        console.log("  Rewards added successfully!");
        
        vm.stopBroadcast();
        
        // Log new state
        uint256 newRewardPool = babyStaking.getTotalRewardPool();
        uint256 newRewardRate = babyStaking.getRewardRate();
        uint256 newRemainingRewards = babyStaking.getRemainingRewards();
        
        console.log("\n===========================================");
        console.log("Rewards Added Successfully!");
        console.log("===========================================");
        console.log("\nNew BabyStaking state:");
        console.log("  Total Reward Pool:", newRewardPool / 1e18, "BABY");
        console.log("  New Reward Rate:", newRewardRate, "per second");
        console.log("  Remaining Rewards:", newRemainingRewards / 1e18, "BABY");
        console.log("  Duration:", rewardDuration / 86400, "days");
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