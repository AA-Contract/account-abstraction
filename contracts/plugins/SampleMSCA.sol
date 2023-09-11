// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "../interfaces/IAccount.sol";
import "../interfaces/plugin/IPluginExecutor.sol";
import "../interfaces/plugin/IPluginManager.sol";
import "../interfaces/plugin/IPluginLoupe.sol";
import "../interfaces/plugin/IStandardExecutor.sol";
import "../interfaces/plugin/IPlugin.sol";
import "../core/Helpers.sol";
import "../interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract SampleMSCA is 
    IAccount, IPluginExecutor, IPluginManager, IPluginLoupe,
    IStandardExecutor, UUPSUpgradeable, Initializable 
{
    using ECDSA for bytes32;
    using UserOperationLib for UserOperation;

    event MSCAInitialized(IEntryPoint indexed entryPoint, address indexed owner);

    struct PluginUninstallInfo {
        bytes manifestHash;
        address[] dependencies;
    }

    struct PluginExecuteValidation {
        bytes4[] permittedExecutionSelectors;
        ManifestExternalCallPermission[] permittedExternalCalls;
    }

    mapping (address plugin => PluginUninstallInfo) private _pluginUninstallInfo;
    mapping (address plugin => PluginExecuteValidation) private _pluginExecuteValidation;

    address public owner;
    IEntryPoint private immutable _entryPoint;
    bytes4 constant public PLUGIN_INTERFACE_ID = 0x848b838e;
    address[] public installedPlugins;
    

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    
    function entryPoint() public view returns (IEntryPoint) {
        return _entryPoint;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    /**
     * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
     * a new implementation of SimpleAccount must be deployed with the new EntryPoint address, then upgrading
      * the implementation by calling `upgradeTo()`
     */
    function initialize(address anOwner) public virtual initializer {
        _initialize(anOwner);
    }

    function _initialize(address anOwner) internal virtual {
        owner = anOwner;
        emit MSCAInitialized(_entryPoint, owner);
    }

    function _onlyOwner() internal view {
        //directly from EOA owner, or through the account itself (which gets redirected through execute())
        require(msg.sender == owner || msg.sender == address(this), "only owner");
    }

    /**
     * Getter Functions
    */

    function getExecutionFunctionConfig(bytes4 executionSelector) external view returns (ExecutionFunctionConfig memory) {}

    function getExecutionHooks(bytes4 executionSelector) external view returns (ExecutionHook[] memory) {}

    function getStandardExecutionHooks(bytes4 executionSelector, AssociatedFunction calldata validator) external view returns (ExecutionHook[] memory) {}

    function getPreUserOpValidatorHooks(bytes4 executionSelector, AssociatedFunction calldata userOpValidator) external view returns (AssociatedFunction[] memory) {}

    function getPreRuntimeValidatorHooks(bytes4 executionSelector, AssociatedFunction calldata runtimeValidator) external view returns (AssociatedFunction[] memory) {}

    function getInstalledPlugins() external view returns (address[] memory) {}

    /**
     * Plugin Installation Functions
    */

    function installPlugin(address plugin, bytes32 manifestHash, bytes calldata installData, address[] calldata dependencies) external {
        
        // Plugin Interface Check
        if(!ERC165Checker.supportsERC165InterfaceUnchecked(plugin, PLUGIN_INTERFACE_ID)) {
            revert();
        }

        // Manifest Check through staticcall
        bytes memory encodedParams = abi.encodeCall(IPlugin.pluginManifest, ());
        bool success;
        uint256 returnSize;
        PluginManifest memory manifest;

        assembly {
            success := staticcall(30000, plugin, add(encodedParams, 0x20), mload(encodedParams), 0x00, 0x20)
            returnSize := returndatasize()
            manifest := mload(0x00)
        }

        if (!success || returnSize < 0x20) {
            revert();
        } else {
            if (keccak256(abi.encode(mainfest)) != manifestHash) {
                revert();
            }
        }

        // Dependency Check
        // @TODO Check for already installed dependencies
        if (dependencies.length != manifest.dependencyInterfaceIds.length) {
            revert();
        }
        for(uint256 i = 0; i < manifest.dependencyInterfaceIds.length;) {
            if(ERC165Checker.supportsERC165InterfaceUnchecked(dependencies[i], manifest.dependencyInterfaceIds[i])) {
                revert();
            }
            unchecked {
                ++i;
            }
        }
        _pluginUninstallInfo[plugin] = PluginUninstallInfo(manifestHash, dependencies);
        _pluginExecuteValidation[plugin] = PluginExecution(manifest.permittedExecutionSelectors, manifest.permittedExternalCalls);
        

        installedPlugins.push(plugin);

        IPlugin(plugin).onInstall(installData);


    }

    function uninstallPlugin(address plugin, bytes calldata uninstallData) external {

    }

    /**
     * Validation Functions 
    */

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
    external returns (uint256 validationData) {}

    /**
     * Execution Functions 
    */

    function execute(address target, uint256 value, bytes calldata data, address validationPlugin, uint8 validationFunctionId) external payable {
        if(ERC165Checker.supportsERC165InterfaceUnchecked(target, PLUGIN_INTERFACE_ID)) {
            revert();
        }

        _call(target, value, data);
    }

    function executeBatch(Execution[] calldata executions, address validationPlugin, uint8 validationFunctionId) external payable {
        for(uint256 i = 0; i < executions.length;) {
            if(ERC165Checker.supportsERC165InterfaceUnchecked(executions[i].target, PLUGIN_INTERFACE_ID)) {
                revert();
            }
            _call(executions[i].target, executions[i].value, executions[i].data);
            
            unchecked {
                ++i;
            }
        }
    }

    function executeFromPlugin(bytes calldata data) external payable {

    }

    function executeFromPluginExternal(address target, uint256 value, bytes calldata data) external payable {
        if(ERC165Checker.supportsERC165InterfaceUnchecked(target, PLUGIN_INTERFACE_ID)) {
            revert();
        }
    }




    /**
     * Internal Functions
    */

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value : value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        _onlyOwner();
    }

}