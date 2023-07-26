// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.12;

import "./TestRecoveryToken.sol";
import "../samples/SimpleAccount.sol";

/**
 * A test account, for testing expiry.
 * add "temporary" owners, each with a time range (since..till) times for each.
 * NOTE: this is not a full "session key" implementation: a real session key should probably limit
 * other things, like target contracts and methods to be called.
 * also, the "since" value is not really useful, only for testing the entrypoint.
 */
contract TestAccount is SimpleAccount {
    using ECDSA for bytes32;

    TestRecoveryToken public recoveryToken;
    uint8 threshold;
    bytes4 private constant FUNCTION_EXECUTE = bytes4(keccak256("execute(address,uint256,bytes)"));
    bytes4 private constant FUNCTION_EXECUTE_BATCH = bytes4(keccak256("executeBatch(address[],bytes[])"));
    uint256 private constant DATE_LENGTH = 6;

    struct TargetMethods {
        address delegatedContract;
        bytes4[] delegatedFunctions;
    }
    
    struct TargetInfo {
	    mapping(address => bool) delegatedContractMap;
	    mapping(address => mapping(bytes4 => bytes)) delegatedFunctionPeriods;
	    mapping(address => mapping(bytes4 => bool)) delegatedFunctionMap;
    }

    mapping(address => TargetInfo) internal delegationMap;


    // solhint-disable-next-line no-empty-blocks
    constructor(IEntryPoint anEntryPoint) SimpleAccount(anEntryPoint) {}


    function initialize(address anOwner) public virtual override initializer {
        recoveryToken = new TestRecoveryToken(address(this));
        super._initialize(anOwner);
    }

    // As this is a test contract, no need for proxy, so no need to disable init
    // solhint-disable-next-line no-empty-blocks
    function _disableInitializers() internal override {}

    function addTemporaryOwner(address owner, uint48 _after, uint48 _until, TargetMethods[] calldata delegations) external onlyOwner {
        require(_until > _after, "wrong until/after");
        TargetInfo storage _targetInfo = delegationMap[owner];
        uint256 delegationsLength = delegations.length;
        for (uint256 index; index < delegationsLength; ++index) {
            TargetMethods memory delegation = delegations[index];
            address delegatedContract = delegation.delegatedContract;

            _targetInfo.delegatedContractMap[delegatedContract] = true;

            uint256 delegatedFunctionsLength = delegation.delegatedFunctions.length;
            for (uint256 functionIndex; functionIndex < delegatedFunctionsLength; ++functionIndex) {
                // total 96 bits : | 48 bits - _after | 48 bits - _until |
                bytes4 delegatedFunction = delegation.delegatedFunctions[functionIndex];
                _targetInfo.delegatedFunctionPeriods[delegatedContract][
                    delegation.delegatedFunctions[functionIndex]
                ]
                = abi.encodePacked(_after, _until);
                _targetInfo.delegatedFunctionMap[delegatedContract][delegatedFunction] = true;
            }
        }
    }

    // implement template method of BaseAccount
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal view override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);
        
        if (signer == owner) {
            return _packValidationData(false, type(uint48).max, 0);
        }
        bytes4 userOpSelector = getSelector(userOp.callData);
        return _validateSessionKey(userOp.callData, signer, userOpSelector);
        
    }

    function _validateSessionKey(bytes calldata userOpCallData, address signer, bytes4 userOpSelector) 
    internal view returns (uint256 validationData) {
        address[] memory dest; 
        bytes[] memory func;
        bool sigFailed;
        uint48 _after;
        uint48 _until = 1;

        if (userOpSelector == FUNCTION_EXECUTE) {
            (dest, func) = _decodeSingle(userOpCallData); 	
        } else if (userOpSelector == FUNCTION_EXECUTE_BATCH) {
            (dest, func) = _decodeBatch(userOpCallData);
        } else {
            return _packValidationData(sigFailed, _until, _after);
        }

        TargetInfo storage targetInfo = delegationMap[signer];

        uint256 length = dest.length;
        if (length == 0) {
            sigFailed = true;
        }
        for (uint256 i; i < length; ++i) {
            if (targetInfo.delegatedContractMap[dest[i]]) {
                bytes4 selec = this.getSelector(func[i]);
                if (targetInfo.delegatedFunctionMap[dest[i]][selec]) {
                    (_after, _until) = _decode(targetInfo.delegatedFunctionPeriods[dest[i]][selec]);
                    return _packValidationData(sigFailed, _until, _after);
                }
            }
        }
        // Returning _until : 1 & _after : 0 if not found
        return _packValidationData(sigFailed, _until, _after);
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

    function getSelector(bytes calldata _data) public pure returns (bytes4 selector) {
        selector = bytes4(_data[0:4]);
    }

    function _decodeSingle(bytes calldata _data) internal pure returns (address[] memory dest, bytes[] memory func){
        dest = new address[](1);
        func = new bytes[](1);
        (dest[0], , func[0]) = abi.decode(_data[4:], (address, uint256, bytes));
    }

    function _decodeBatch(bytes calldata _data) internal pure returns (address[] memory dest, bytes[] memory func){
        (dest, func) = abi.decode(_data[4:], (address[], bytes[]));
    }

    function _decode(bytes memory _data) internal pure returns (uint48 _after, uint48 _until) {
        assembly {
            _after := mload(add(_data, DATE_LENGTH))
            _until := mload(add(_data, mul(DATE_LENGTH, 2)))
        }
    }
}