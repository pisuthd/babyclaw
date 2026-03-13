// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Script, console} from "forge-std/Script.sol";
import "../../src/Comptroller.sol";
import "../../src/BabyPriceOracle.sol";
import "../../src/tokens/CToken.sol";
import "../../src/tokens/CErc20Immutable.sol";
import "../../src/tokens/CEther.sol";
import "../../src/interest-rates/JumpRateModelV2.sol";
import "../../src/interfaces/ComptrollerInterface.sol";
import "../../src/interfaces/InterestRateModel.sol";

/**
 * @title DeployProtocol 
 * @notice Deploy all protocol contracts and configure the BabyClaw system
 * @dev Usage: 
 *   forge script script/core/4-DeployProtocol.s.sol --rpc-url celo_mainnet --broadcast --verify
 * 
 * Prerequisites:
 *   1. BabyToken deployed
 *   2. BabyPriceOracle deployed
 *   3. BabyStaking deployed
 */
contract DeployProtocol is Script {
    
    // Native token address
    address public constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    // Deployed contract addresses (set from environment variables)
    address public ORACLE;
    address public BABY_TOKEN;
    address public BABY_STAKING;
    
    // Official USDT
    address public USDT;
    
    // Deployment configuration
    uint256 public constant INITIAL_EXCHANGE_RATE = 0.2e18; // 0.2 cToken per underlying
    uint8 public constant CTOKEN_DECIMALS = 8;
    
    // Protocol configuration
    uint256 public constant CLOSE_FACTOR = 0.5e18; // 50% - max liquidation per transaction
    uint256 public constant LIQUIDATION_INCENTIVE = 1.08e18; // 8% liquidation bonus
    
    // Collateral factors (what % of asset value can be borrowed against)
    uint256 public constant USDT_COLLATERAL_FACTOR = 0.85e18; // 85% for USDT
    uint256 public constant NATIVE_COLLATERAL_FACTOR = 0.75e18; // 75% for native token
    uint256 public constant BABY_COLLATERAL_FACTOR = 0.1e18; // 10% for BABY token
    
    // Borrow caps (0 = no cap)
    uint256 public constant NO_CAP = 0; // No borrow cap
    
    // Deployed contracts
    Comptroller public comptroller;
    JumpRateModelV2 public stablecoinRateModel;
    JumpRateModelV2 public volatileRateModel;
    CErc20Immutable public cUSDT;
    CErc20Immutable public cBABY;
    CEther public cNative;
    
    function run() external {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = _parsePrivateKey(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploying Complete BabyClaw Protocol");
        console.log("===========================================");
        console.log("Chain ID:", block.chainid);
        
        console.log("Deployer address:", deployer);
        console.log("Block number:", block.number);
        
        // Check deployer balance
        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance / 1e18, "native tokens");
        require(balance > 0.3 ether, "Insufficient balance for deployment");
        
        // Get prerequisite contract addresses
        ORACLE = 0xaB0f04EF204Db673DDf6A075129d8C2B7f85caAE;
        BABY_STAKING = 0x999B1A634796d4a94ff4223537d47979a4C07624;
        BABY_TOKEN = 0xE370336C3074E76163b2f9B07876d0Cb3425488D;
        USDT = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;
 
        _verifyPrerequisites();
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy Comptroller first
        _deployComptroller();
        
        // 2. Deploy Interest Rate Models
        _deployInterestRateModels(deployer);
        
        // 3. Deploy cTokens 
        _deployCTokens(deployer);
        
        // 4. Configure the protocol
        _configureProtocol();
        
        // 5. Support markets
        _supportMarkets();
        
        // 6. Set risk parameters
        _setRiskParameters();
        
        // 7. Enable BABY utility features
        _enableBabyUtility();
        
        vm.stopBroadcast();
        
        _logDeploymentResults(); 
    }
    

    function _verifyPrerequisites() internal view {
        console.log("\nVerifying prerequisite contracts...");
        require(ORACLE != address(0), "Oracle address not set");
        require(BABY_TOKEN != address(0), "BabyToken address not found");
        require(USDT != address(0), "USDT address not found");
        require(BABY_STAKING != address(0), "BabyStaking address not set");
        console.log("All prerequisite contracts verified");
    }
    
    function _deployComptroller() internal {
        console.log("\n1. Deploying Comptroller...");
        
        // Deploy comptroller directly
        comptroller = new Comptroller();
        console.log("Comptroller:", address(comptroller));
    }
    
    function _deployInterestRateModels(address deployer) internal {
        console.log("\n2. Deploying Interest Rate Models...");
        
        // 1 second block time = 31,536,000 blocks per year
        uint256 blocksPerYear = 31536000;
        
        // Stablecoin rate model (for USDT)
        // - 3% base rate, 4% slope before kink, 109% jump after 80% utilization
        stablecoinRateModel = new JumpRateModelV2(
            0.03e18,         // 3% base rate per year
            0.04e18,         // 4% multiplier per year before kink
            1.09e18,         // 109% jump multiplier per year after kink
            0.80e18,         // 80% kink point
            payable(deployer), // owner
            blocksPerYear     // blocks per year
        );
        console.log("StablecoinRateModel:", address(stablecoinRateModel));
        
        // Volatile asset rate model (for BABY, Native)
        // - 3% base rate, 15% slope before kink, 200% jump after 80% utilization
        volatileRateModel = new JumpRateModelV2(
            0.03e18,         // 3% base rate per year
            0.15e18,         // 15% multiplier per year before kink
            2.00e18,         // 200% jump multiplier per year after kink
            0.80e18,         // 80% kink point
            payable(deployer), // owner
            blocksPerYear     // blocks per year
        );
        console.log("VolatileRateModel:", address(volatileRateModel));
    }
    
    function _deployCTokens(address deployer) internal {
        console.log("\n3. Deploying cTokens...");
        
        // cUSDT (stablecoin - uses stablecoin rate model)
        cUSDT = new CErc20Immutable(
            USDT,
            ComptrollerInterface(address(comptroller)),
            InterestRateModel(address(stablecoinRateModel)),
            INITIAL_EXCHANGE_RATE,
            "Compound USDT",
            "cUSDT",
            CTOKEN_DECIMALS,
            payable(deployer)
        );
        console.log("cUSDT:", address(cUSDT));
        
        // cBABY (volatile asset - uses volatile rate model)
        cBABY = new CErc20Immutable(
            BABY_TOKEN,
            ComptrollerInterface(address(comptroller)),
            InterestRateModel(address(volatileRateModel)),
            INITIAL_EXCHANGE_RATE,
            "Compound BABY",
            "cBABY",
            CTOKEN_DECIMALS,
            payable(deployer)
        );
        console.log("cBABY:", address(cBABY));
        
        // cNative for native token (volatile asset - uses volatile rate model)
        cNative = new CEther(
            ComptrollerInterface(address(comptroller)),
            InterestRateModel(address(volatileRateModel)),
            INITIAL_EXCHANGE_RATE,
            "Compound CELO",
            "cCELO",
            CTOKEN_DECIMALS,
            payable(deployer)
        );
        console.log("cCELO:", address(cNative));
    }
    
    function _configureProtocol() internal {
        console.log("\n4. Configuring Protocol...");
        
        // Set price oracle
        comptroller._setPriceOracle(PriceOracle(ORACLE));
        console.log("Price oracle set:", ORACLE);
        
        // Set liquidation parameters
        comptroller._setCloseFactor(CLOSE_FACTOR);
        comptroller._setLiquidationIncentive(LIQUIDATION_INCENTIVE);
        console.log("Close factor set:", CLOSE_FACTOR);
        console.log("Liquidation incentive set:", LIQUIDATION_INCENTIVE);
    }
    
    function _supportMarkets() internal {
        console.log("\n5. Supporting Markets...");
        
        // Support all cToken markets
        uint result;
        
        result = comptroller._supportMarket(CToken(address(cUSDT)));
        require(result == 0, "Failed to support cUSDT market");
        console.log("cUSDT market supported");
        
        result = comptroller._supportMarket(CToken(address(cBABY)));
        require(result == 0, "Failed to support cBABY market");
        console.log("cBABY market supported");
        
        result = comptroller._supportMarket(CToken(address(cNative)));
        require(result == 0, "Failed to support cNative market");
        console.log("cNative market supported");
    }
    
    function _setRiskParameters() internal {
        console.log("\n6. Setting Risk Parameters...");
        
        // Set collateral factors
        uint result;
        
        result = comptroller._setCollateralFactor(CToken(address(cUSDT)), USDT_COLLATERAL_FACTOR);
        require(result == 0, "Failed to set cUSDT collateral factor");
        console.log("cUSDT collateral factor:", USDT_COLLATERAL_FACTOR, "(85%)");
        
        result = comptroller._setCollateralFactor(CToken(address(cNative)), NATIVE_COLLATERAL_FACTOR);
        require(result == 0, "Failed to set cNative collateral factor");
        console.log("cNative collateral factor:", NATIVE_COLLATERAL_FACTOR, "(75%)");
        
        result = comptroller._setCollateralFactor(CToken(address(cBABY)), BABY_COLLATERAL_FACTOR);
        require(result == 0, "Failed to set cBABY collateral factor");
        console.log("cBABY collateral factor:", BABY_COLLATERAL_FACTOR, "(10%)");
        
        // Set borrow caps (all no cap for testing)
        CToken[] memory cTokens = new CToken[](3);
        uint[] memory borrowCaps = new uint[](3);
        
        cTokens[0] = CToken(address(cUSDT));
        cTokens[1] = CToken(address(cBABY));
        cTokens[2] = CToken(address(cNative));
        
        borrowCaps[0] = NO_CAP;
        borrowCaps[1] = NO_CAP;
        borrowCaps[2] = NO_CAP;
        
        comptroller._setMarketBorrowCaps(cTokens, borrowCaps);
        console.log("All borrow caps set to: No cap (borrowable)");
    }
    
    function _enableBabyUtility() internal {
        console.log("\n7. Enabling BABY Utility Features...");
        
        // Enable BABY staking utility features
        uint result;
        result = comptroller._setBabyStaking(BABY_STAKING);
        require(result == 0, "Failed to set BabyStaking address");
        console.log("BabyStaking address set:", BABY_STAKING);
        
        result = comptroller._setBabyUtilityEnabled(true);
        require(result == 0, "Failed to enable BABY utility");
        console.log("BABY utility enabled: true");
    }
    
    function _logDeploymentResults() internal view {
        console.log("\n===========================================");
        console.log("Complete Protocol Deployment Summary");
        console.log("===========================================");
        
        console.log("\nCore Contracts:");
        console.log("Comptroller:", address(comptroller));
        console.log("Oracle:", ORACLE);
        console.log("BabyToken:", BABY_TOKEN);
        console.log("BabyStaking:", BABY_STAKING);
        
        console.log("\nInterest Rate Models:");
        console.log("StablecoinRateModel:", address(stablecoinRateModel));
        console.log("VolatileRateModel:", address(volatileRateModel)); 
        
        console.log("\nMarkets:");
        console.log("cUSDT:", address(cUSDT));
        console.log("cBABY:", address(cBABY));
        console.log("cCELO:", address(cNative));
        
        console.log("\nMarket Configuration:");
        console.log("USDT: 85% collateral factor");
        console.log("Native: 75% collateral factor");
        console.log("BABY: 10% collateral factor");
        
        console.log("\nBABY Utility: ENABLED");
        console.log("Staked BABY provides boost to borrow limits");
    }
 

    function _parsePrivateKey(string memory privateKeyString) internal pure returns (uint256) {
        if (bytes(privateKeyString)[0] == '0' && bytes(privateKeyString)[1] == 'x') {
            return vm.parseUint(privateKeyString);
        } else {
            return vm.parseUint(string(abi.encodePacked("0x", privateKeyString)));
        }
    }
}