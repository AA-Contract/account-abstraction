// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

interface IPluginExecutor {
    function executeFromPlugin(bytes calldata data) external payable;

    function executeFromPluginExternal(address target, uint256 value, bytes calldata data) external payable;
}