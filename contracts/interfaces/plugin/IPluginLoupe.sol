// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.12;

interface IPluginLoupe {
    struct AssociatedFunction {
        address plugin;
        uint8 functionId;
    }

    struct ExecutionFunctionConfig {
        address plugin;
        AssociatedFunction userOpValidator;
        AssociatedFunction runtimeValidator;
    }

    struct ExecutionHook {
        AssociatedFunction preExecHook;
        AssociatedFunction postExecHook;
    }

    function getExecutionFunctionConfig(bytes4 executionSelector) external view returns (ExecutionFunctionConfig memory);

    function getExecutionHooks(bytes4 executionSelector) external view returns (ExecutionHook[] memory);

    function getStandardExecutionHooks(bytes4 executionSelector, AssociatedFunction calldata validator) external view returns (ExecutionHook[] memory);

    function getPreUserOpValidatorHooks(bytes4 executionSelector, AssociatedFunction calldata userOpValidator) external view returns (AssociatedFunction[] memory);

    function getPreRuntimeValidatorHooks(bytes4 executionSelector, AssociatedFunction calldata runtimeValidator) external view returns (AssociatedFunction[] memory);

    function getInstalledPlugins() external view returns (address[] memory);
}