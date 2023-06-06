// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;


import "./TestRecoveryToken.sol";
import "../samples/SimpleAccount.sol";

contract TestSocialRecovryWallet is SimpleAccount {
	TestRecoveryToken public recoveryToken;
	uint8 threshold;
	bool public isRegistered;

	constructor(IEntryPoint anEntryPoint) SimpleAccount(anEntryPoint) {
		_registerRecoveryToken();
	}

	function _registerRecoveryToken() internal {
		require(!isRegistered, "already mint recovery token");
		recoveryToken = new TestRecoveryToken(address(this));
		isRegistered = true;
	}

	function registerGuardian(address[] memory guardians, uint8 _threshold) external onlyOwner {
		require(guardians.length <= recoveryToken.maxSupply(), "exceeds max supply");
		require(threshold <= guardians.length, "Threshold exceeds guardians count");
        require(threshold >= 2, "At least 2 friends required");
		threshold = _threshold;
		for (uint256 i = 0; i < guardians.length; i++) {
			require(guardians[i] != address(this), "Invalid wallet guardian");
			recoveryToken.setQualification(guardians[i]);
		}
	}

	function deleteGuardian(address[] memory _guardians) external onlyOwner {
		address[] guardians = recoveryToken._guardians();
		require(threshold <= guardians.length - _guardians.length, "Threshold exceeds guardians count");
		for (uint256 i = 0; i < guardians.length; i++) {
			recoveryToken.deleteQualification(guardians[i]);
		}
	}

	function recoveryWallet(address newOwner) external {
		require(recoveryToken.balanceOf(address(this), newOwner) > threshold, "Not enough confirmations");
		_setOwner(newOwner);
		//recoveryToken.updateNonce();
		recoveryToken.updateNonceAndRecordRecovery();
	}
	
	function setGuardianMaxSupply(uint8 max) onlyOwner external {
		require(max > 0, "invalid MAX: zero");
		recoveryToken.setMaxSupply(max);
	}
	function setTimeInterval(uint256 time) onlyOwner external {
		recoveryToken.setTimeInterval(time);
	}
	function _setOwner(address newOwner) onlyOwner internal {
		owner = anOwner;
	}
}