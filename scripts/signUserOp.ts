import { ethers } from 'hardhat'
import { fillUserOp, signUserOp } from '../test/UserOp'
import { UserOperation } from '../test/UserOperation'
import { EntryPoint, TestExpiryAccount } from '../typechain'
import { Wallet } from 'ethers'

async function sign(
    account: TestExpiryAccount,
    signer: Wallet,
    entryPoint: EntryPoint,
    isSuccess: boolean
) {
    // Used TestCounter Contract as a target method
    const counter = await ethers.getContractAt("TestCounter", "0x3918E00482b2C5F3f25beD0981a694f64B2281DE")
    const count = counter.interface.encodeFunctionData('count')
    // Not enrolled method, so the UserOp will fail if isSuccess == false.
    const justemit = counter.interface.encodeFunctionData('justemit')
    const callData = isSuccess? 
        account.interface.encodeFunctionData('execute', [counter.address, 0, count])
        : account.interface.encodeFunctionData('execute', [counter.address, 0, justemit])
    const nonce = await account.getNonce()
    const op: Partial<UserOperation> = {
        sender: account.address,
        nonce: nonce,
        initCode: '0x',
        callData: callData,
        paymasterAndData: '0x',
        verificationGasLimit: 5e5
    }

    const filledOp = await fillUserOp(op, entryPoint)
    const chainId = 5
    const signedOp = signUserOp(filledOp, signer, entryPoint.address, chainId)
    
    return signedOp
}

export default sign