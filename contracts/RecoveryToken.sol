// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;


contract RecoveryToken {
    address immutable receiver;
    uint256 nonce;
    uint256 threshold;
    uint8 private _totalSupply;
    uint8 private _maxSupply;

    struct RecoveryProcess {
        address owner;
        address newOwner;
        bool isRequested;
        //uint48 blockToExpire;
        uint8 guardianVoteCount;
    }

    RecoveryProcess recoveryProcess;

    mapping(address => mapping(bytes32 => uint256)) private _balances;
    mapping(address => mapping(bytes32 => bool)) private _guardians;
    
    constructor(address _receiver, uint256 _threshold) {
        receiver = _receiver;
        threshold = _threshold;
    }

    function totalSupply() public view returns (uint8) {
        return _totalSupply;
    }

    function maxSupply() public view returns (uint8) {
        return _maxSupply;
    }

    function getThreshold() public view returns (uint256) {
        return threshold;
    }

	function balanceOf(address account, address newOwner) external view returns (uint256) {
		return _balances[account][getRecoveryHash(newOwner, nonce)];
	}
    
	function mint(address account) external onlyReceiver RecoveryNotRequested { 
        bytes32 receiverHash = getReceiverHash(); 
        require(account != address(0), "mint to the zero account");
        require(!_guardians[account][receiverHash], "duplicate guardians");

        if (_totalSupply >= _maxSupply) {
            revert("exceed max supply");
        }

        else {    
            _guardians[account][receiverHash] = true;
            _totalSupply++; 
        }
	}

	function burn(address account) external onlyReceiver RecoveryNotRequested {
        require(account != address(0), "burn from the zero account");
        require(_totalSupply >= threshold, "guardians less than threshold");
        bytes32 receiverHash = getReceiverHash();
        require(_guardians[account][receiverHash], "account not guardian");
		_guardians[account][getReceiverHash()] = false;
        _totalSupply--;
	}

	function updateNonce() external onlyReceiver {
		nonce++;
	}


    function requestRecovery(address newOwner) external RecoveryNotRequested {
        require(_guardians[msg.sender][getReceiverHash()], "caller not a guardian");
        require(newOwner != address(0), "owner cannot be the zero account");
        recoveryProcess.newOwner = newOwner;
        recoveryProcess.isRequested = true;
        
    }

    // function cancelRecovery() external {
    //     require(_guardians)
    // } 악의적인 가디언 방지책

    function getRecoveryInfo() public view RecoveryRequested returns(RecoveryProcess memory)  {
        return recoveryProcess;
    }

    
	function confirmRecovery(address newOwner) external RecoveryRequested {
        require(_guardians[msg.sender][getReceiverHash()], "caller not a guardian");
		bytes32 recoveryHash = getRecoveryHash(newOwner, nonce);
        require(!_guardians[msg.sender][recoveryHash], "already confirm");
		_guardians[msg.sender][recoveryHash] = true; 
		_transfer(recoveryHash, receiver);
        recoveryProcess.guardianVoteCount++;

        require(recoveryProcess.guardianVoteCount >= getThreshold());
        //recoverWallet();
	}

	function _transfer(bytes32 recoveryHash, address to) internal {
        _balances[to][recoveryHash] += 1;
	}

	function getRecoveryHash(address _newOwner, uint256 _nonce) public pure returns (bytes32) {
      return keccak256(abi.encode(_newOwner, _nonce));
    }

    //function getCancelHash()

	function getReceiverHash() public view returns (bytes32) {
      return keccak256(abi.encode(receiver));
    }
    

    modifier onlyReceiver() {
        require(msg.sender == receiver, "OnlyReceiver");
        _;
    }

    modifier RecoveryRequested() {
        require(recoveryProcess.isRequested, "recovery is not on going");
        _;
    }

    modifier RecoveryNotRequested() {
        require(!recoveryProcess.isRequested, "recovery is on going");
        _;
    }


}
