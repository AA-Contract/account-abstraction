// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

interface IPluginManager {
    event PluginInstalled(address plugin);
    event PluginUninstalled(address plugin);

    function installPlugin(address plugin, bytes32 manifestHash, bytes calldata installData, address[] calldata dependencies) external;

    function uninstallPlugin(address plugin, bytes calldata uninstallData) external;
}