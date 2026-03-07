// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../../src/utils/MockToken.sol";
import "./MockBabyStaking.sol";

contract MockBabyStakingTest is Test {
    MockBabyStaking public babyStaking;
    MockToken public babyToken;
    
    address public admin;
    address public user1;
    address public user2;
    address public user3;
    address public user4;
    address public user5;
    
    function setUp() public {
        admin = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);
        user4 = address(0x4);
        user5 = address(0x5);
        
        // Deploy BABY token
        babyToken = new MockToken("BABY Token", "BABY", 18, 10000000e18);
        
        // Deploy MockBabyStaking
        babyStaking = new MockBabyStaking(address(babyToken));
    }
    
    function testDeployment() public {
        assertEq(babyStaking.admin(), admin);
        assertEq(babyStaking.babyToken(), address(babyToken));
    }
    
    function testStakedAmount() public {
        // Initially no stake
        assertEq(babyStaking.getStakedAmount(user1), 0);
        
        // Set staked balance
        babyStaking.setStakedBalance(user1, 1000e18);
        assertEq(babyStaking.getStakedAmount(user1), 1000e18);
    }
    
    function testStakingTiers() public {
        // Test Tier 0 (no stake)
        babyStaking.setStakedBalance(user1, 0);
        assertEq(babyStaking.getStakingTier(user1), 0);
        
        // Test Tier 1 (10,000 BABY)
        babyStaking.setStakedBalance(user2, 10000e18);
        assertEq(babyStaking.getStakingTier(user2), 1);
        
        // Test Tier 2 (100,000 BABY)
        babyStaking.setStakedBalance(user3, 100000e18);
        assertEq(babyStaking.getStakingTier(user3), 2);
        
        // Test Tier 3 (1,000,000 BABY)
        babyStaking.setStakedBalance(user4, 1000000e18);
        assertEq(babyStaking.getStakingTier(user4), 3);
        
        // Test Tier 4 (10,000,000 BABY)
        babyStaking.setStakedBalance(user5, 10000000e18);
        assertEq(babyStaking.getStakingTier(user5), 4);
    }
    
    function testLiquidationProtection() public {
        // Tier 0 should have no protection
        babyStaking.setUserToTier(user1, 0);
        assertFalse(babyStaking.hasLiquidationProtection(user1));
        
        // Tier 1+ should have protection
        babyStaking.setUserToTier(user2, 1);
        assertTrue(babyStaking.hasLiquidationProtection(user2));
        
        babyStaking.setUserToTier(user3, 2);
        assertTrue(babyStaking.hasLiquidationProtection(user3));
        
        babyStaking.setUserToTier(user4, 3);
        assertTrue(babyStaking.hasLiquidationProtection(user4));
        
        babyStaking.setUserToTier(user5, 4);
        assertTrue(babyStaking.hasLiquidationProtection(user5));
    }
    
    function testBorrowRateDiscount() public {
        // Tier 0: 0% discount
        babyStaking.setUserToTier(user1, 0);
        assertEq(babyStaking.getBorrowRateDiscount(user1), 0);
        
        // Tier 1: 5% discount (500 bps)
        babyStaking.setUserToTier(user2, 1);
        assertEq(babyStaking.getBorrowRateDiscount(user2), 500);
        
        // Tier 2: 10% discount (1000 bps)
        babyStaking.setUserToTier(user3, 2);
        assertEq(babyStaking.getBorrowRateDiscount(user3), 1000);
        
        // Tier 3: 15% discount (1500 bps)
        babyStaking.setUserToTier(user4, 3);
        assertEq(babyStaking.getBorrowRateDiscount(user4), 1500);
        
        // Tier 4: 20% discount (2000 bps)
        babyStaking.setUserToTier(user5, 4);
        assertEq(babyStaking.getBorrowRateDiscount(user5), 2000);
    }
    
    function testLiquidationThresholdBuffer() public {
        // Tier 0: 0% buffer
        babyStaking.setUserToTier(user1, 0);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user1), 0);
        
        // Tier 1: 2% buffer (2e16)
        babyStaking.setUserToTier(user2, 1);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user2), 2e16);
        
        // Tier 2: 3% buffer (3e16)
        babyStaking.setUserToTier(user3, 2);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user3), 3e16);
        
        // Tier 3: 5% buffer (5e16)
        babyStaking.setUserToTier(user4, 3);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user4), 5e16);
        
        // Tier 4: 7% buffer (7e16)
        babyStaking.setUserToTier(user5, 4);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user5), 7e16);
    }
    
    function testSetUserToTier() public {
        // Test setting each tier
        babyStaking.setUserToTier(user1, 0);
        assertEq(babyStaking.getStakedAmount(user1), 0);
        assertEq(babyStaking.getStakingTier(user1), 0);
        
        babyStaking.setUserToTier(user1, 1);
        assertEq(babyStaking.getStakedAmount(user1), 10000e18);
        assertEq(babyStaking.getStakingTier(user1), 1);
        
        babyStaking.setUserToTier(user1, 2);
        assertEq(babyStaking.getStakedAmount(user1), 100000e18);
        assertEq(babyStaking.getStakingTier(user1), 2);
        
        babyStaking.setUserToTier(user1, 3);
        assertEq(babyStaking.getStakedAmount(user1), 1000000e18);
        assertEq(babyStaking.getStakingTier(user1), 3);
        
        babyStaking.setUserToTier(user1, 4);
        assertEq(babyStaking.getStakedAmount(user1), 10000000e18);
        assertEq(babyStaking.getStakingTier(user1), 4);
    }
    
    function testSetUserToTierReverts() public {
        // Should revert for invalid tier
        vm.expectRevert("tier must be 0-4");
        babyStaking.setUserToTier(user1, 5);
        
        // Should revert for non-admin
        vm.prank(user1);
        vm.expectRevert("only admin");
        babyStaking.setUserToTier(user2, 1);
    }
    
    function testSetStakedBalanceReverts() public {
        // Should revert for non-admin
        vm.prank(user1);
        vm.expectRevert("only admin");
        babyStaking.setStakedBalance(user2, 1000e18);
    }

    function testMultipleUsers() public {
        // Set different users to different tiers
        babyStaking.setUserToTier(user1, 0);
        babyStaking.setUserToTier(user2, 1);
        babyStaking.setUserToTier(user3, 2);
        babyStaking.setUserToTier(user4, 3);
        babyStaking.setUserToTier(user5, 4);
        
        // Verify all users have correct settings
        assertEq(babyStaking.getStakingTier(user1), 0);
        assertEq(babyStaking.getStakingTier(user2), 1);
        assertEq(babyStaking.getStakingTier(user3), 2);
        assertEq(babyStaking.getStakingTier(user4), 3);
        assertEq(babyStaking.getStakingTier(user5), 4);
        
        // Verify borrow rate discounts
        assertEq(babyStaking.getBorrowRateDiscount(user1), 0);
        assertEq(babyStaking.getBorrowRateDiscount(user2), 500);
        assertEq(babyStaking.getBorrowRateDiscount(user3), 1000);
        assertEq(babyStaking.getBorrowRateDiscount(user4), 1500);
        assertEq(babyStaking.getBorrowRateDiscount(user5), 2000);
        
        // Verify liquidation buffers
        assertEq(babyStaking.getLiquidationThresholdBuffer(user1), 0);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user2), 2e16);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user3), 3e16);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user4), 5e16);
        assertEq(babyStaking.getLiquidationThresholdBuffer(user5), 7e16);
    }
    
    function testTierThresholds() public {
        // Test exact threshold boundaries
        
        // Just below Tier 1 threshold
        babyStaking.setStakedBalance(user1, 9999e18);
        assertEq(babyStaking.getStakingTier(user1), 0);
        
        // Exactly Tier 1 threshold
        babyStaking.setStakedBalance(user1, 10000e18);
        assertEq(babyStaking.getStakingTier(user1), 1);
        
        // Just below Tier 2 threshold
        babyStaking.setStakedBalance(user1, 99999e18);
        assertEq(babyStaking.getStakingTier(user1), 1);
        
        // Exactly Tier 2 threshold
        babyStaking.setStakedBalance(user1, 100000e18);
        assertEq(babyStaking.getStakingTier(user1), 2);
        
        // Just below Tier 3 threshold
        babyStaking.setStakedBalance(user1, 999999e18);
        assertEq(babyStaking.getStakingTier(user1), 2);
        
        // Exactly Tier 3 threshold
        babyStaking.setStakedBalance(user1, 1000000e18);
        assertEq(babyStaking.getStakingTier(user1), 3);
        
        // Just below Tier 4 threshold
        babyStaking.setStakedBalance(user1, 9999999e18);
        assertEq(babyStaking.getStakingTier(user1), 3);
        
        // Exactly Tier 4 threshold
        babyStaking.setStakedBalance(user1, 10000000e18);
        assertEq(babyStaking.getStakingTier(user1), 4);
    }
    
    function testInterfaceCompliance() public {
        // Test that all interface functions exist and return expected types
        
        // Test getStakedAmount
        babyStaking.setStakedBalance(user1, 5000e18);
        uint256 staked = babyStaking.getStakedAmount(user1);
        assertEq(staked, 5000e18);
        
        // Test getStakingTier
        uint256 tier = babyStaking.getStakingTier(user1);
        assertEq(tier, 0); // 5000 < 10000, so Tier 0
        
        // Test hasLiquidationProtection
        bool hasProtection = babyStaking.hasLiquidationProtection(user1);
        assertFalse(hasProtection);
        
        // Test getBorrowRateDiscount
        uint256 discount = babyStaking.getBorrowRateDiscount(user1);
        assertEq(discount, 0);
        
        // Test getLiquidationThresholdBuffer
        uint256 buffer = babyStaking.getLiquidationThresholdBuffer(user1);
        assertEq(buffer, 0);
    }
    
    function testEdgeCases() public {
        // Test zero address user (should work but return 0 for everything)
        address zeroAddress = address(0);
        assertEq(babyStaking.getStakedAmount(zeroAddress), 0);
        assertEq(babyStaking.getStakingTier(zeroAddress), 0);
        assertFalse(babyStaking.hasLiquidationProtection(zeroAddress));
        assertEq(babyStaking.getBorrowRateDiscount(zeroAddress), 0);
        assertEq(babyStaking.getLiquidationThresholdBuffer(zeroAddress), 0);
        
        // Test very large amounts (above Tier 4)
        babyStaking.setStakedBalance(user1, 50000000e18); // 50M BABY
        assertEq(babyStaking.getStakingTier(user1), 4); // Still Tier 4 (max)
        assertEq(babyStaking.getBorrowRateDiscount(user1), 2000); // Max discount
        assertEq(babyStaking.getLiquidationThresholdBuffer(user1), 7e16); // Max buffer
    }
}