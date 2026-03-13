// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./utils/ErrorReporter.sol";
import "./interfaces/PriceOracle.sol";
import "./tokens/CErc20.sol";
import "./interfaces/EIP20Interface.sol";

/**
 * @title BabyPriceOracle
 * @notice A Compound V2-compatible price oracle with manual price setting only
 * @dev This oracle uses only manual price setting just for this MVP
 * 
 * Prices are normalized to account for underlying token decimals:
 * - For 18-decimal tokens: price = USD_price * 1e18
 * - For 6-decimal tokens:  price = USD_price * 1e30 (1e18 * 1e12 decimal adjustment)
 * - For 8-decimal tokens:  price = USD_price * 1e28 (1e18 * 1e10 decimal adjustment)
 */
contract BabyPriceOracle is PriceOracle {
    
    // Owner address for admin functions
    address public owner;
    
    // Mapping of asset addresses to their manually set prices
    mapping(address => uint256) public assetPrices;
    
    // Mapping of asset addresses to price update timestamps
    mapping(address => uint256) public lastPriceUpdateTime;
    
    // Whitelist of addresses allowed to set prices
    mapping(address => bool) public whitelist;
    
    // Native cToken symbols per chain (cCELO for Celo, etc.)
    mapping(string => bool) public isNativeCToken;
    
    // Configuration parameters
    uint256 public stalenessThreshold;
    uint256 public constant MAX_PRICE_DEVIATION_BPS = 5000; // 50% max change
    uint256 public constant PRICE_UPDATE_DELAY = 1 hours;
    uint256 public constant MIN_PRICE = 1e6;    // $0.000001
    uint256 public constant MAX_PRICE = 1e24;   // $1,000,000
    
    // Track last valid price for deviation checking
    mapping(address => uint256) public lastValidPrice;

    event PricePosted(address indexed asset, uint previousPriceMantissa, uint requestedPriceMantissa, uint newPriceMantissa);
    event StalenessThresholdUpdated(uint256 newThreshold);
    event NativeCTokenSet(string symbol, bool isNative);
    event WhitelistUpdated(address indexed user, bool whitelisted);

    modifier isWhitelisted() {
        require(whitelist[msg.sender], "BabyPriceOracle: Not whitelisted");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "BabyPriceOracle: Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        stalenessThreshold = 3600; // 1 hour default
        whitelist[msg.sender] = true;
        // Set cCELO as native by default (Celo chain)
        isNativeCToken["cCELO"] = true;
    }

    /**
     * @notice Get the underlying address of a cToken
     * @param cToken The cToken to get the underlying address for
     * @return The address of the underlying asset
     */
    function _getUnderlyingAddress(CToken cToken) private view returns (address) {
        address asset;
        // Check if this is a native cToken (cCELO, etc.)
        if (isNativeCToken[cToken.symbol()]) {
            asset = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // Native token address
        } else {
            asset = address(CErc20(address(cToken)).underlying());
        }
        return asset;
    }

    /**
     * @notice Get the price of an underlying asset
     * @param cToken The cToken whose underlying price we want
     * @return The price of the underlying asset, scaled by 1e18
     */
    function getUnderlyingPrice(CToken cToken) public override view returns (uint) {
        address underlying = _getUnderlyingAddress(cToken);
        uint8 underlyingDecimals = _getUnderlyingDecimals(underlying);
        
        uint256 basePrice = assetPrices[underlying];
        require(basePrice > 0, "BabyPriceOracle: Price not set");
        
        // Apply decimal adjustment for Compound V2 compatibility
        uint256 decimalAdjustment = _getDecimalAdjustment(underlyingDecimals);
        
        // Avoid overflow by checking if we need to divide instead of multiply
        if (decimalAdjustment > 1e18) {
            return basePrice * (decimalAdjustment / 1e18);
        } else {
            return basePrice * decimalAdjustment / 1e18;
        }
    }

    /**
     * @notice Get the decimals of an underlying asset
     * @param underlying The address of the underlying asset
     * @return The number of decimals of the asset
     */
    function _getUnderlyingDecimals(address underlying) private view returns (uint8) {
        // Handle native token
        if (underlying == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            return 18;
        }
        
        // Get decimals from ERC20 contract
        return EIP20Interface(underlying).decimals();
    }

    /**
     * @notice Get the decimal adjustment factor for a token
     * @param tokenDecimals The number of decimals of the token
     * @return The decimal adjustment factor
     */
    function _getDecimalAdjustment(uint8 tokenDecimals) private pure returns (uint256) {
        if (tokenDecimals >= 18) {
            return 1e18;
        }
        
        // For tokens with < 18 decimals, multiply by additional factor
        // This ensures borrowBalance * price calculation works correctly
        uint8 decimalDifference = 18 - tokenDecimals;
        return 1e18 * (10 ** decimalDifference);
    }

    /**
     * @notice Set the price of an asset manually
     * @param asset The address of the asset
     * @param price The price to set (in USD, scaled by 1e18)
     */
    function setDirectPrice(address asset, uint price) public isWhitelisted { 
        require(price > 0, "BabyPriceOracle: Price must be positive");
        require(price >= MIN_PRICE && price <= MAX_PRICE, 
            "BabyPriceOracle: Price out of global bounds");

        if (lastPriceUpdateTime[asset] != 0) {
            require(block.timestamp >= lastPriceUpdateTime[asset] + PRICE_UPDATE_DELAY,
                "BabyPriceOracle: Price update too frequent");
        }
        
        // Check price deviation
        uint256 lastPrice = lastValidPrice[asset];
        if (lastPrice > 0) {
            uint256 minPrice = lastPrice * (10000 - MAX_PRICE_DEVIATION_BPS) / 10000;
            uint256 maxPrice = lastPrice * (10000 + MAX_PRICE_DEVIATION_BPS) / 10000;
            require(price >= minPrice && price <= maxPrice, 
                    "BabyPriceOracle: Price deviation too high");
        }

        emit PricePosted(asset, assetPrices[asset], price, price);
        assetPrices[asset] = price;
        lastValidPrice[asset] = price;
        lastPriceUpdateTime[asset] = block.timestamp;
    }

    /**
     * @notice Get price information for a cToken
     * @param cToken The cToken to get price info for
     * @return underlying The underlying asset address
     * @return decimals The number of decimals of the underlying asset
     * @return basePrice The base price before decimal adjustment
     * @return finalPrice The final price after decimal adjustment
     * @return decimalAdjustment The decimal adjustment factor applied
     */
    function getPriceInfo(CToken cToken) external view returns (
        address underlying,
        uint8 decimals,
        uint256 basePrice,
        uint256 finalPrice,
        uint256 decimalAdjustment
    ) {
        underlying = _getUnderlyingAddress(cToken);
        decimals = _getUnderlyingDecimals(underlying);
        basePrice = assetPrices[underlying];
        decimalAdjustment = _getDecimalAdjustment(decimals);
        finalPrice = getUnderlyingPrice(cToken);
    }

    /**
     * @notice Compare two strings (helper function)
     * @param a First string
     * @param b Second string
     * @return Whether the strings are equal
     */
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    // Admin functions

    /**
     * @notice Set the staleness threshold for price updates
     * @param newThreshold The new threshold in seconds
     */
    function setStalenessThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "BabyPriceOracle: Invalid threshold");
        stalenessThreshold = newThreshold;
        emit StalenessThresholdUpdated(newThreshold);
    }

    /**
     * @notice Set or unset a cToken symbol as native token wrapper
     * @param symbol The cToken symbol
     * @param isNative Whether this cToken wraps the native chain token
     */
    function setNativeCToken(string calldata symbol, bool isNative) external onlyOwner {
        isNativeCToken[symbol] = isNative;
        emit NativeCTokenSet(symbol, isNative);
    }

    // Whitelist management functions

    /**
     * @notice Add address to whitelist for setDirectPrice function
     * @param user The address to add to whitelist
     */
    function addToWhitelist(address user) external onlyOwner {
        require(user != address(0), "BabyPriceOracle: Cannot whitelist zero address");
        whitelist[user] = true;
        emit WhitelistUpdated(user, true);
    }

    /**
     * @notice Remove address from whitelist
     * @param user The address to remove from whitelist
     */
    function removeFromWhitelist(address user) external onlyOwner {
        whitelist[user] = false;
        emit WhitelistUpdated(user, false);
    }

    /**
     * @notice Check if an address is whitelisted
     * @param user The address to check
     * @return Whether the address is whitelisted
     */
    function isWhitelistedAddress(address user) external view returns (bool) {
        return whitelist[user];
    }

    /**
     * @notice Get the current price for an asset
     * @param asset The asset address
     * @return The current price for the asset
     */
    function getPrice(address asset) external view returns (uint256) {
        return assetPrices[asset];
    }

    /**
     * @notice Get the last update time for an asset price
     * @param asset The asset address
     * @return The timestamp of the last price update
     */
    function getLastUpdateTime(address asset) external view returns (uint256) {
        return lastPriceUpdateTime[asset];
    }

    /**
     * @notice Check if a price is stale
     * @param asset The asset address
     * @return Whether the price is considered stale
     */
    function isPriceStale(address asset) external view returns (bool) {
        if (lastPriceUpdateTime[asset] == 0) {
            return true;
        }
        return block.timestamp > lastPriceUpdateTime[asset] + stalenessThreshold;
    }
}