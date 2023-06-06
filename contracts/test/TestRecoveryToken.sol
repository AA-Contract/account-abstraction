
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

contract TestRecoveryToken {
    uint256 nonce; // 32 bytes
	uint256 TIME_INTERVAL = 86400; // 1 days, default, 32 bytes
    address receiver; // 20 bytes
	uint8 public maxSupply; // 1 bytes
	
	struct GuardianInfo { // 52 bytes
		address guardianAddr;
		uint256 registeredTime;
	}
	GuardianInfo[] internal _guardiansInfo;
	mapping(address => uint256) public recovery;
	mapping(address => mapping(bytes32 => uint256)) private _balances;
    mapping(address => mapping(bytes32 => bool)) private _confirm;

    constructor(address _receiver) {
        receiver = _receiver;
    }

	function setMaxSupply(uint8 max) external onlyReceiver {
		maxSupply = max;
	}
	function setTimeInterval(uint8 timeInterval) external onlyReceiver {
		TIME_INTERVAL = timeInterval;
	}
	function setQualification(address account) external onlyReceiver { 
		require(_guardiansInfo.length <= maxSupply, "maximum guardians");
        require(_isGuardian(account) <= maxSupply, "duplicate guardians");
		
        _guardiansInfo.push(GuardianInfo(account, block.timestamp));
	}

	function deleteQualification(address account) external onlyReceiver {
		uint256 index = _isGuardian(account);
		if(index <= maxSupply) {
			_guardiansInfo[index] = _guardiansInfo[_guardiansInfo.length - 1];
			_guardiansInfo.pop();
		} else revert("not a guardian");
	}

	function updateNonce() external onlyReceiver {
		nonce++;
	}

	function updateNonceAndRecordRecovery(address newOwner) external onlyReceiver {
		bytes32 recoveryHash = getRecoveryHash(newOwner, nonce);
		for (uint256 i = 0; i < _guardiansInfo.length; i++) {
			address guardianAddr = _guardiansInfo[i].guardianAddr;
          if(_confirm[guardianAddr][recoveryHash]) recovery[guardianAddr]++; 
		}
		nonce++;
	}

	function confirmReocvery(address newOwner) external {
        uint256 index = _isGuardian(newOwner);
		require(index <= maxSupply, "caller not a guardian");
		require(_guardiansInfo[index].registeredTime + TIME_INTERVAL < block.timestamp, "invalid guardian");
		bytes32 recoveryHash = getRecoveryHash(newOwner, nonce);
        require(!_confirm[msg.sender][recoveryHash], "already confirm");
		_confirm[msg.sender][recoveryHash] = true;
		_mint(recoveryHash, receiver);
	}

	function getRecoveryHash(address _newOwner, uint256 _nonce) public pure returns (bytes32) {
      return keccak256(abi.encode(_newOwner, _nonce));
    }
	function getReceiverHash() public view returns (bytes32) {
      return keccak256(abi.encode(receiver));
    }
	function balanceOf(address account, address newOwner) external view returns (uint256) {
		return _balances[account][getRecoveryHash(newOwner, nonce)];
	}

	function _mint(bytes32 recoveryHash, address to) internal {
        _balances[to][recoveryHash] += 1;
	}
	function _isGuardian(address _guardian) public view returns (uint256) {
        for (uint256 i = 0; i < _guardiansInfo.length; i++) {
            if (_guardiansInfo[i].guardianAddr == _guardian) return i;
        }
		return type(uint16).max; //overflow MAX guardian 
    }
	

    modifier onlyReceiver() {
        require(msg.sender == receiver, "Only receiver");
        _;
    }
}
