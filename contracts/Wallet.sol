// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./BaseAccount.sol";
import "./Ownable.sol";
import "./RecoveryToken.sol";

contract Wallet is BaseAccount {

    bool private isRegistered;
    address owner;
    uint256 threshold;
   

    constructor(IEntryPoitn _entryPoint, address _owner, uint256 _threshold) {
        require(_owner != adress(0), "Owner cannot be zero");
        require(_threshold >= 2, "At least 2 friends required");
        owner = _owner;
        threshold = _threshold;
        _registerRecoveryToken(threshold);
    }

    function _registerRecoveryToken(uint256 _threshold) internal {
        require(!isRegistered, "already mint recover token");
        recoveryToken = new RecoveryToken(address(this));
        isRegistered = true;

    }

	function registerGuardian(address[] memory guardians) external onlyOwner {
        require(guardians.length <= recoveryToken.maxSupply(), "exceeds max supply");
		require(threshold <= guardians.length,"Threshold exceeds guardians count");
       
		for (uint256 i = 0; i < guardians.length; i++) {
			require(guardians[i] != address(this), "Invalid wallet guardian");
			recoveryToken.mint(guardians[i]);
		}

	}

    function setGuardianThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold >= 2, "At least 2 friends required");
        threshold = _threshold;
        recoveryToken.threshold = _threshold;
    }

    modifier onlyOwenr() {
        require(msg.sender == owner, "only owner can call");
        _;
    }

}
