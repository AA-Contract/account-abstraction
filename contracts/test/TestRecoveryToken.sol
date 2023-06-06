
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

contract TestRecoveryToken {
    uint256 nonce; // 32 bytes
	uint256 public TIME_INTERVAL = 86400; // 1 days, default, 32 bytes
    address receiver; // 20 bytes
	uint8 private _maxSupply; // 1 bytes
	
	struct GuardianInfo { // 52 bytes
		address guardianAddr;
		uint256 registeredTime;
		uint256 deletedTime;
	}
	GuardianInfo[] internal _guardiansInfo;
	mapping(address => uint256) public recovery;
	mapping(address => mapping(bytes32 => uint256)) private _balances;
    mapping(address => mapping(bytes32 => bool)) private _confirm;

    constructor(address _receiver) {
        receiver = _receiver;
    }

	function setMaxSupply(uint8 max) external onlyReceiver {
		_maxSupply = max;
	}
	function setTimeInterval(uint256 timeInterval) external onlyReceiver {
		require(timeInterval > TIME_INTERVAL, "minimum time is 1 day");
		TIME_INTERVAL = timeInterval;
	}
	function mint(address account) external onlyReceiver { 
		require(_guardiansInfo.length <= _maxSupply, "maximum guardians");
        require(_isGuardian(account) > _maxSupply, "duplicate guardians");
		
        _guardiansInfo.push(GuardianInfo(account, block.timestamp, 0));
	}

	function burn(address account, bool cancel) external onlyReceiver {
		uint256 index = _isGuardian(account);
		uint256 deletedTime = _guardiansInfo[index].deletedTime;
		require(index <= _maxSupply, "not a guardian");
		if(cancel && deletedTime != 0) {
			_guardiansInfo[index].deletedTime = 0;
		} else if (!cancel && deletedTime == 0) {
			_guardiansInfo[index].deletedTime = block.timestamp;
		} else if (!cancel && _guardiansInfo[index].deletedTime + TIME_INTERVAL < block.timestamp) {
			_guardiansInfo[index] = _guardiansInfo[_guardiansInfo.length - 1];
			_guardiansInfo.pop();
		}
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
		require(index <= _maxSupply, "caller not a guardian");
		require(_guardiansInfo[index].registeredTime + TIME_INTERVAL < block.timestamp, "invalid guardian");
		require(
			_guardiansInfo[index].deletedTime == 0 || _guardiansInfo[index].deletedTime + TIME_INTERVAL > block.timestamp, 
			"invalid guardian"
		);
		bytes32 recoveryHash = getRecoveryHash(newOwner, nonce);
        require(!_confirm[msg.sender][recoveryHash], "already confirm");
		_confirm[msg.sender][recoveryHash] = true;
		_transfer(recoveryHash, receiver);
	}

	function getRecoveryHash(address _newOwner, uint256 _nonce) public pure returns (bytes32) {
      return keccak256(abi.encode(_newOwner, _nonce));
    }
	function getReceiverHash() public view returns (bytes32) {
      return keccak256(abi.encode(receiver));
    }
	function getTotalSupply() external view returns (uint8) {
      return uint8(_guardiansInfo.length);
    }
	function getMaxSupply() external view returns (uint8) {
      return _maxSupply;
    }
	function balanceOf(address account, address newOwner) external view returns (uint256) {
		return _balances[account][getRecoveryHash(newOwner, nonce)];
	}

	function _transfer(bytes32 recoveryHash, address to) internal {
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
