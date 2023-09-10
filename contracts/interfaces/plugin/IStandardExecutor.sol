// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

struct Execution {
    address target;
    uint256 value;
    bytes data;
}

interface IStandardExecutor {
    function execute(address target, uint256 value, bytes calldata data, address validationPlugin, uint8 validationFunctionId) external payable;

    function executeBatch(Execution[] calldata executions, address validationPlugin, uint8 validationFunctionId) external payable;
}