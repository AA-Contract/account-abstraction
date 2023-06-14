// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;


import "./TestRecoveryToken.sol";
import "../samples/SimpleAccount.sol";

contract TestSocialRecoveryAccount is SimpleAccount {
	TestRecoveryToken public recoveryToken;
	uint8 threshold;

	constructor(IEntryPoint anEntryPoint) SimpleAccount(anEntryPoint) {}

	function initialize(address anOwner) public virtual override initializer {
		recoveryToken = new TestRecoveryToken(address(this));
        _initialize(anOwner);
    }


	function registerGuardian(address[] memory guardians, uint8 _threshold) external onlyOwner {
		require(guardians.length <= recoveryToken.getMaxSupply(), "exceeds max supply");
        require(_threshold >= 2, "At least 2 friends required");
		threshold = _threshold;
		for (uint256 i = 0; i < guardians.length; i++) {
			require(guardians[i] != address(this), "Invalid wallet guardian");
			recoveryToken.mint(guardians[i]);
		}
	}

	function deleteGuardian(address[] memory _guardians) external onlyOwner {
		require(threshold <= recoveryToken.getTotalSupply() - _guardians.length, "Threshold exceeds guardians count");
		for (uint256 i = 0; i < _guardians.length; i++) {
			recoveryToken.burn(_guardians[i], false);
		}
	}

	function recoveryWallet(address newOwner) external {
		require(recoveryToken.balanceOf(address(this), newOwner) >= threshold, "Not enough confirmations");
		_setOwner(newOwner);
		//recoveryToken.updateNonce();
		recoveryToken.updateNonceAndRecordRecovery(newOwner);
	}
	
	function setGuardianMaxSupply(uint8 max) onlyOwner external {
		require(max > 0, "invalid MAX: zero");
		recoveryToken.setMaxSupply(max);
	}
	function setTimeInterval(uint256 time) onlyOwner external {
		recoveryToken.setTimeInterval(time);
	}
	function _setOwner(address newOwner) internal {
		owner = newOwner;
	}
}
