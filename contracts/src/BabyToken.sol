// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

/**
 * @title BabyToken
 * @notice ERC-20 token with fixed 1 billion supply and AI-agent role-based management
 * @dev Fixed supply token with Creator and AI-Agent roles
 * 
 * Features:
 * - Fixed name: "BabyToken"
 * - Fixed symbol: "BABY"
 * - Fixed total supply: 1 billion tokens
 * - No minting after deployment
 * - Creator role with full control
 * - AI-Agent role with burn-only capability
 * - Pausable functionality
 * - Role-based access control
 */
contract BabyToken is ERC20, ERC20Pausable, AccessControl {
    
    // Role definitions
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant AI_AGENT_BURNER_ROLE = keccak256("AI_AGENT_BURNER_ROLE");
    
    // Token parameters
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    // Events
    event AIAgentRoleGranted(address indexed aiAgent);
    event AIAgentRoleRevoked(address indexed aiAgent);
    event TokensBurnedByAI(address indexed aiAgent, uint256 amount);
    event TokensBurnedByCreator(uint256 amount);
    
    /**
     * @notice Constructor
     * @param creator Address that will receive all tokens and have creator role
     * @param aiAgent Initial AI agent address (can be zero address)
     */
    constructor(
        address creator,
        address aiAgent
    ) ERC20("BabyToken", "BABY") {
        require(creator != address(0), "Creator cannot be zero address");
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, creator);
        _grantRole(CREATOR_ROLE, creator);
        
        // Mint total supply to creator
        _mint(creator, TOTAL_SUPPLY);
        
        // Set initial AI agent if provided
        if (aiAgent != address(0)) {
            _grantRole(AI_AGENT_BURNER_ROLE, aiAgent);
            emit AIAgentRoleGranted(aiAgent);
        }
    }
    
    /**
     * @notice Pause token transfers (Creator only)
     */
    function pause() external onlyRole(CREATOR_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause token transfers (Creator only)
     */
    function unpause() external onlyRole(CREATOR_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Burn tokens (AI Agent or Creator only)
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        address burner = msg.sender;
        
        if (hasRole(AI_AGENT_BURNER_ROLE, burner)) {
            require(amount > 0, "Amount must be greater than 0");
            _burn(burner, amount);
            emit TokensBurnedByAI(burner, amount);
        } else if (hasRole(CREATOR_ROLE, burner)) {
            require(amount > 0, "Amount must be greater than 0");
            _burn(burner, amount);
            emit TokensBurnedByCreator(amount);
        } else {
            revert("Caller does not have burn permission");
        }
    }
    
    /**
     * @notice Grant AI agent burner role (Creator only)
     * @param aiAgent Address to grant AI agent role to
     */
    function grantAIAgentRole(address aiAgent) external onlyRole(CREATOR_ROLE) {
        require(aiAgent != address(0), "AI agent cannot be zero address");
        _grantRole(AI_AGENT_BURNER_ROLE, aiAgent);
        emit AIAgentRoleGranted(aiAgent);
    }
    
    /**
     * @notice Revoke AI agent burner role (Creator only)
     * @param aiAgent Address to revoke AI agent role from
     */
    function revokeAIAgentRole(address aiAgent) external onlyRole(CREATOR_ROLE) {
        require(aiAgent != address(0), "AI agent cannot be zero address");
        _revokeRole(AI_AGENT_BURNER_ROLE, aiAgent);
        emit AIAgentRoleRevoked(aiAgent);
    }
    
    /**
     * @notice Check if address is AI agent
     * @param account Address to check
     * @return True if address has AI agent role
     */
    function isAIAgent(address account) external view returns (bool) {
        return hasRole(AI_AGENT_BURNER_ROLE, account);
    }
    
    /**
     * @notice Check if address is Creator
     * @param account Address to check
     * @return True if address has Creator role
     */
    function isCreator(address account) external view returns (bool) {
        return hasRole(CREATOR_ROLE, account);
    }
    
    // The following functions are overrides required by Solidity
    
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override(ERC20, ERC20Pausable)
    {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    /**
     * @notice SupportsInterface implementation
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}