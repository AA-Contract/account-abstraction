import { ethers } from 'hardhat'
import { fillUserOp, signUserOp } from './test/UserOp'
import { UserOperation } from './test/UserOperation'

async function createUserOp() {


const provider = ethers.provider
const signer =  new ethers.Wallet('c5e460632f7d1017bef6b4e8806632ac3ca78c91fa2ce4ea5dc7d25d018e3176', provider)

const owner = signer.address

const factory = await ethers.getContractAt('TestSocialRecoveryAccountFactory', '0xEc11Ac274B50aECC9340d75fC48d10E5d2C83b92')

const initCode = await ethers.utils.hexConcat([
    factory.address,
    factory.interface.encodeFunctionData('createAccount', [owner, 123])
  ])

const op: Partial<UserOperation> = {
    initCode: initCode,
    callData: '0x',
    paymasterAndData: '0x'
}


const entryPointAddr = '0xa9Bedd3f021c5815d2ed6Ace07DcCB7FeEf8Da4F'

const entryPoint = await ethers.getContractAt('EntryPoint', entryPointAddr)

const filledOp = await fillUserOp(op, entryPoint)


const chainId = 5

const signedOp = signUserOp(filledOp, signer, entryPointAddr, chainId)
console.log('Signed user operation:', signedOp)

await entryPoint.connect(signer)

const beneficiary = '0xeE75F5A0de99C4DD8ae7D94fFAb8De755ea634F6'

await entryPoint.handleOps([signedOp], beneficiary, {gasLimit: 10e6}).then((tx) => {
    console.log('Transaction', tx);
 })

// await signer.sendTransaction({
//     from: signer.address,
//     to: signedOp.sender,
//     value: ethers.utils.parseEther('0.1')
// })

// await entryPoint.handleOps([signedOp], beneficiary, {gasLimit: 10e6}).then((tx) => {
//     console.log('Transaction', tx);
//  })

}


createUserOp()
