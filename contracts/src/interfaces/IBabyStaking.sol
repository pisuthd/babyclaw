// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

/**
 * @title IBabyStaking Interface
 * @notice Interface for BABY token staking contract
 * @dev Used by Comptroller to query user staking status for utility features
 */
interface IBabyStaking {
    /**
     * @notice Get the amount of BABY tokens a user has staked
     * @param user The address of the user
     * @return The amount of BABY tokens staked
     */
    function getStakedAmount(address user) external view returns (uint256);

    /**
     * @notice Get the staking tier for a user
     * @dev Tier determines level of benefits (0 = no stake, 1-4 = increasing benefits)
     * @param user The address of the user
     * @return The staking tier (0-4)
     */
    function getStakingTier(address user) external view returns (uint256);

    /**
     * @notice Check if a user has liquidation protection active
     * @param user The address of the user
     * @return True if user has liquidation protection
     */
    function hasLiquidationProtection(address user) external view returns (bool);

    /**
     * @notice Get the borrow rate discount for a user in basis points
     * @dev Used to reduce borrow interest rates (e.g., 500 = 5% discount)
     * @param user The address of the user
     * @return Discount in basis points (0-2000, where 2000 = 20% max)
     */
    function getBorrowRateDiscount(address user) external view returns (uint256);

    /**
     * @notice Get liquidation threshold buffer for a user in mantissa format
     * @dev Shortfall required before liquidation (e.g., 2e16 = 2%)
     * @param user The address of the user
     * @return Buffer threshold in mantissa (0-10e16, where 10e16 = 10% max)
     */
    function getLiquidationThresholdBuffer(address user) external view returns (uint256);

    // ========== Reward Distribution Functions ==========

    /**
     * @notice Get the amount of unclaimed rewards for a user
     * @param user The address of the user
     * @return The amount of BABY tokens available to claim
     */
    function getRewards(address user) external view returns (uint256);

    /**
     * @notice Get the current reward per token rate
     * @return The reward per token accumulated across all stakers
     */
    function getRewardPerToken() external view returns (uint256);

    /**
     * @notice Get the effective reward rate for a user (with tier multiplier)
     * @param user The address of the user
     * @return The effective reward rate based on user's tier
     */
    function getEffectiveRewardRate(address user) external view returns (uint256);

    /**
     * @notice Get the tier reward multiplier
     * @param tier The tier level (0-4)
     * @return The multiplier as percentage (100 = 1x, 150 = 1.5x, etc.)
     */
    function getTierMultiplier(uint256 tier) external view returns (uint256);

    /**
     * @notice Get the total rewards distributed so far
     * @return Total BABY tokens distributed as rewards
     */
    function getTotalRewardsDistributed() external view returns (uint256);

    /**
     * @notice Get the current reward rate (tokens per second)
     * @return The current reward rate
     */
    function getRewardRate() external view returns (uint256);

    /**
     * @notice Get the rewards duration
     * @return The duration of the current reward period in seconds
     */
    function getRewardsDuration() external view returns (uint256);

    /**
     * @notice Get the total reward pool available
     * @return The total BABY tokens allocated for rewards
     */
    function getTotalRewardPool() external view returns (uint256);

    /**
     * @notice Get the amount of rewards remaining in the pool
     * @return The amount of BABY tokens remaining to be distributed
     */
    function getRemainingRewards() external view returns (uint256);
}
