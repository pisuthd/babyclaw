// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IBabyStaking.sol";

/**
 * @title BabyStaking
 * @notice BABY token staking contract with tier-based benefits and reward distribution
 * @dev Users stake BABY tokens to receive benefits and earn BABY token rewards
 * 
 * Features:
 * - Staking and unstaking of BABY tokens
 * - 5-tier system based on staked amounts
 * - Borrow rate discounts for stakers
 * - Liquidation protection for higher tiers
 * - Per-second reward distribution
 * - Tier-based reward multipliers
 * - Emergency withdrawal mechanism
 * - Pausable by admin
 * - Role-based access control
 */
contract BabyStaking is IBabyStaking, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    /// @notice BABY token contract
    IERC20 public immutable babyToken;

    /// @notice Mapping of user addresses to their staked BABY amount
    mapping(address => uint256) public stakedBalances;

    /// @notice Mapping of user addresses to their stake timestamps
    mapping(address => uint256) public stakeTimestamps;

    /// @notice Total staked BABY tokens across all users
    uint256 public totalStaked;

    // ========== Reward Distribution ==========

    /// @notice Reward per token accumulated across all stakers
    uint256 public rewardPerTokenStored;

    /// @notice Mapping of user addresses to their reward per token paid
    mapping(address => uint256) public userRewardPerTokenPaid;

    /// @notice Mapping of user addresses to their unclaimed rewards
    mapping(address => uint256) public rewards;

    /// @notice Current reward rate (BABY tokens per second)
    uint256 public rewardRate;

    /// @notice Timestamp of last reward update
    uint256 public lastUpdateTime;

    /// @notice Duration of reward period (default: 1 year = 365 days)
    uint256 public rewardsDuration = 365 days;

    /// @notice Total reward pool allocated
    uint256 public totalRewardPool;

    /// @notice Total rewards distributed so far
    uint256 public totalRewardsDistributed;

    /// @notice Tier reward multipliers (100 = 1x, 150 = 1.5x, etc.)
    mapping(uint256 => uint256) public tierMultipliers;

    /// @notice Minimum period before unclaimed rewards can be recovered (5 years)
    uint256 public constant REWARDS_RECOVERY_PERIOD = 5 * 365 days;

    /**
     * @notice Tier thresholds (in BABY tokens)
     * Tier 1: 10,000 BABY
     * Tier 2: 100,000 BABY
     * Tier 3: 1,000,000 BABY
     * Tier 4: 10,000,000 BABY
     */
    uint256 public constant TIER_1_THRESHOLD = 10_000 * 1e18;
    uint256 public constant TIER_2_THRESHOLD = 100_000 * 1e18;
    uint256 public constant TIER_3_THRESHOLD = 1_000_000 * 1e18;
    uint256 public constant TIER_4_THRESHOLD = 10_000_000 * 1e18;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    event TierUpdated(address indexed user, uint256 oldTier, uint256 newTier);

    // Reward events
    event RewardAdded(uint256 reward);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event TierMultiplierUpdated(uint256 tier, uint256 newMultiplier);
    event UnclaimedRewardsRecovered(address indexed user, uint256 amount);

    /**
     * @notice Constructor
     * @param _babyToken Address of the BABY token contract
     * @param admin Address of the initial admin
     */
    constructor(address _babyToken, address admin) {
        require(_babyToken != address(0), "BabyToken address cannot be zero");
        require(admin != address(0), "Admin address cannot be zero");

        babyToken = IERC20(_babyToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);

        // Initialize tier multipliers
        tierMultipliers[0] = 100;  // 1x
        tierMultipliers[1] = 150;  // 1.5x
        tierMultipliers[2] = 200;  // 2x
        tierMultipliers[3] = 250;  // 2.5x
        tierMultipliers[4] = 300;  // 3x
    }

    // ========== Modifier ==========

    modifier updateReward(address account) {
        rewardPerTokenStored = getRewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = _earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // ========== Staking Functions ==========

    /**
     * @notice Stake BABY tokens
     * @param amount Amount of BABY tokens to stake
     * @dev User must approve the contract to spend their tokens first
     *      Rewards are automatically claimed before staking
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Amount must be greater than 0");

        uint256 oldTier = getStakingTier(msg.sender);
        
        // Transfer tokens from user to contract
        babyToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update state
        stakedBalances[msg.sender] += amount;
        stakeTimestamps[msg.sender] = block.timestamp;
        totalStaked += amount;

        uint256 newTier = getStakingTier(msg.sender);
        
        emit Staked(msg.sender, amount);
        if (oldTier != newTier) {
            emit TierUpdated(msg.sender, oldTier, newTier);
        }
    }

    /**
     * @notice Unstake BABY tokens
     * @param amount Amount of BABY tokens to unstake
     * @dev Users can unstake up to their total staked balance
     *      Rewards are automatically claimed before unstaking
     */
    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedBalances[msg.sender] >= amount, "Insufficient staked balance");

        uint256 oldTier = getStakingTier(msg.sender);
        
        // Update state
        stakedBalances[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Transfer tokens back to user
        babyToken.safeTransfer(msg.sender, amount);

        uint256 newTier = getStakingTier(msg.sender);
        
        emit Unstaked(msg.sender, amount);
        if (oldTier != newTier) {
            emit TierUpdated(msg.sender, oldTier, newTier);
        }
    }

    /**
     * @notice Emergency withdrawal without tier updates (Emergency role only)
     * @dev For use in emergency situations to allow users to withdraw
     * @param user Address of the user to withdraw for
     */
    function emergencyWithdraw(address user) external onlyRole(EMERGENCY_ROLE) {
        uint256 amount = stakedBalances[user];
        require(amount > 0, "No staked balance for user");

        stakedBalances[user] = 0;
        totalStaked -= amount;

        babyToken.safeTransfer(user, amount);

        emit EmergencyWithdrawal(user, amount);
    }

    // ========== Reward Functions ==========

    /**
     * @notice Claim accumulated rewards
     * @dev Users can claim their pending BABY token rewards
     */
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            babyToken.safeTransfer(msg.sender, reward);
            totalRewardsDistributed += reward;
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    /**
     * @notice Add rewards to the reward pool
     * @param amount Amount of BABY tokens to add to the reward pool
     * @param duration Duration in seconds over which rewards will be distributed
     * @dev Admin function to add BABY tokens for staking rewards
     */
    function addRewards(uint256 amount, uint256 duration) external onlyRole(ADMIN_ROLE) updateReward(address(0)) {
        require(amount > 0, "Amount must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(totalStaked > 0, "No staked tokens");

        // Update rewards duration if specified
        if (duration != rewardsDuration) {
            rewardsDuration = duration;
            emit RewardsDurationUpdated(duration);
        }

        // Transfer BABY tokens from admin to contract
        babyToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update reward pool and rate
        totalRewardPool += amount;
        rewardRate = amount / duration;

        emit RewardAdded(amount);
    }

    // ========== View Functions ==========

    /**
     * @notice Get the amount of BABY tokens a user has staked
     * @param user The address to query
     * @return The amount of BABY tokens staked by the user
     */
    function getStakedAmount(address user) external view override returns (uint256) {
        return stakedBalances[user];
    }

    /**
     * @notice Get the staking tier for a user
     * @param user The address to query
     * @return The tier level (0-4) of the user
     * @dev Tier 0: No stake
     *      Tier 1: >= 10,000 BABY
     *      Tier 2: >= 100,000 BABY
     *      Tier 3: >= 1,000,000 BABY
     *      Tier 4: >= 10,000,000 BABY
     */
    function getStakingTier(address user) public view override returns (uint256) {
        uint256 staked = stakedBalances[user];

        if (staked >= TIER_4_THRESHOLD) return 4;
        if (staked >= TIER_3_THRESHOLD) return 3;
        if (staked >= TIER_2_THRESHOLD) return 2;
        if (staked >= TIER_1_THRESHOLD) return 1;
        return 0;
    }

    /**
     * @notice Check if a user has liquidation protection
     * @param user The address to query
     * @return True if user has liquidation protection, false otherwise
     * @dev For this implementation, anyone with Tier 1+ has protection
     */
    function hasLiquidationProtection(address user) external view override returns (bool) {
        return getStakingTier(user) >= 1;
    }

    /**
     * @notice Get borrow rate discount in basis points
     * @param user The address to query
     * @return Discount in basis points (0-2000, where 2000 = 20%)
     * @dev Discount structure:
     *      Tier 0: 0% (0 bps)
     *      Tier 1: 5% (500 bps)
     *      Tier 2: 10% (1000 bps)
     *      Tier 3: 15% (1500 bps)
     *      Tier 4: 20% (2000 bps)
     */
    function getBorrowRateDiscount(address user) external view override returns (uint256) {
        uint256 tier = getStakingTier(user);
        return tier * 500; // 500 bps per tier = 5% per tier
    }

    /**
     * @notice Get liquidation threshold buffer in mantissa format
     * @param user The address to query
     * @return Buffer in mantissa format (0-10e16, where 10e16 = 10%)
     * @dev Buffer structure:
     *      Tier 0: 0% (0e16)
     *      Tier 1: 2% (2e16)
     *      Tier 2: 3% (3e16)
     *      Tier 3: 5% (5e16)
     *      Tier 4: 7% (7e16)
     */
    function getLiquidationThresholdBuffer(address user) external view override returns (uint256) {
        uint256 tier = getStakingTier(user);

        if (tier == 0) return 0;
        if (tier == 1) return 2e16;  // 2%
        if (tier == 2) return 3e16;  // 3%
        if (tier == 3) return 5e16;  // 5%
        if (tier == 4) return 7e16;  // 7%

        return 0;
    }

    // ========== Reward View Functions ==========

    /**
     * @notice Get the amount of unclaimed rewards for a user
     * @param user The address of the user
     * @return The amount of BABY tokens available to claim
     */
    function getRewards(address user) external view override returns (uint256) {
        return _earned(user);
    }

    /**
     * @notice Get the current reward per token rate
     * @return The reward per token accumulated across all stakers
     */
    function getRewardPerToken() public view override returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalStaked);
    }

    /**
     * @notice Get the effective reward rate for a user (with tier multiplier)
     * @param user The address of the user
     * @return The effective reward rate based on user's tier
     */
    function getEffectiveRewardRate(address user) external view override returns (uint256) {
        uint256 tier = getStakingTier(user);
        uint256 multiplier = tierMultipliers[tier];
        return (rewardRate * multiplier) / 100;
    }

    /**
     * @notice Get the tier reward multiplier
     * @param tier The tier level (0-4)
     * @return The multiplier as percentage (100 = 1x, 150 = 1.5x, etc.)
     */
    function getTierMultiplier(uint256 tier) external view override returns (uint256) {
        return tierMultipliers[tier];
    }

    /**
     * @notice Get the total rewards distributed so far
     * @return Total BABY tokens distributed as rewards
     */
    function getTotalRewardsDistributed() external view override returns (uint256) {
        return totalRewardsDistributed;
    }

    /**
     * @notice Get the current reward rate (tokens per second)
     * @return The current reward rate
     */
    function getRewardRate() external view override returns (uint256) {
        return rewardRate;
    }

    /**
     * @notice Get the rewards duration
     * @return The duration of the current reward period in seconds
     */
    function getRewardsDuration() external view override returns (uint256) {
        return rewardsDuration;
    }

    /**
     * @notice Get the total reward pool available
     * @return The total BABY tokens allocated for rewards
     */
    function getTotalRewardPool() external view override returns (uint256) {
        return totalRewardPool;
    }

    /**
     * @notice Get the amount of rewards remaining in the pool
     * @return The amount of BABY tokens remaining to be distributed
     */
    function getRemainingRewards() external view override returns (uint256) {
        return totalRewardPool - totalRewardsDistributed;
    }

    /**
     * @notice Get stake timestamp for a user
     * @param user The address to query
     * @return Timestamp when user last staked
     */
    function getStakeTimestamp(address user) external view returns (uint256) {
        return stakeTimestamps[user];
    }

    // ========== Internal Functions ==========

    /**
     * @notice Calculate rewards earned by a user
     * @param account The address of the user
     * @return The amount of BABY tokens earned
     */
    function _earned(address account) internal view returns (uint256) {
        uint256 currentRewardPerToken = getRewardPerToken();
        uint256 tier = getStakingTier(account);
        uint256 multiplier = tierMultipliers[tier];
        
        // Calculate effective stake (with tier multiplier)
        uint256 effectiveStake = (stakedBalances[account] * multiplier) / 100;
        
        return ((effectiveStake * (currentRewardPerToken - userRewardPerTokenPaid[account])) / 1e18) + rewards[account];
    }

    // ========== Admin Functions ==========

    /**
     * @notice Pause staking operations (Admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause staking operations (Admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Set rewards duration (Admin only)
     * @param newDuration New duration in seconds
     */
    function setRewardsDuration(uint256 newDuration) external onlyRole(ADMIN_ROLE) {
        require(newDuration > 0, "Duration must be greater than 0");
        rewardsDuration = newDuration;
        emit RewardsDurationUpdated(newDuration);
    }

    /**
     * @notice Set tier multiplier (Admin only)
     * @param tier Tier level (0-4)
     * @param newMultiplier New multiplier as percentage (100 = 1x, 150 = 1.5x, etc.)
     */
    function setTierMultiplier(uint256 tier, uint256 newMultiplier) external onlyRole(ADMIN_ROLE) {
        require(tier <= 4, "Invalid tier");
        require(newMultiplier >= 100, "Multiplier must be at least 100 (1x)");
        require(newMultiplier <= 500, "Multiplier must not exceed 500 (5x)");
        tierMultipliers[tier] = newMultiplier;
        emit TierMultiplierUpdated(tier, newMultiplier);
    }

    /**
     * @notice Withdraw tokens from contract (Admin only)
     * @dev Use only in emergency situations or for contract upgrades
     * @param token Address of token to withdraw
     * @param amount Amount to withdraw
     * @param recipient Address to send tokens to
     */
    function recoverToken(address token, uint256 amount, address recipient) external onlyRole(ADMIN_ROLE) {
        require(token != address(babyToken), "Cannot withdraw staked BABY");
        require(recipient != address(0), "Recipient cannot be zero");
        
        IERC20(token).safeTransfer(recipient, amount);
    }

    /**
     * @notice Recover unclaimed rewards from inactive users (Admin only)
     * @dev Can only recover rewards from users who haven't staked/unstaked for 5+ years
     * @param user Address of the inactive user
     */
    function recoverUnclaimedRewards(address user) external onlyRole(ADMIN_ROLE) {
        require(block.timestamp - stakeTimestamps[user] > REWARDS_RECOVERY_PERIOD, "User not inactive long enough");
        
        uint256 reward = rewards[user];
        if (reward > 0) {
            rewards[user] = 0;
            babyToken.safeTransfer(msg.sender, reward);
            emit UnclaimedRewardsRecovered(user, reward);
        }
    }
}