// To get full UserOp from given TestExpiryAccount and tempOwner
import { ethers } from 'hardhat'
import addTempOwner from './addTempOwner';
import sign from './signUserOp';

async function main() {
    // Hardcoded TestExpiryAccount address
    const account = await ethers.getContractAt(
        'TestExpiryAccount', 
        "0x3eB48129c1B3E2f8022C4177a8329c7DFEf45f99"
    )
    // Global Entrypoint contract for goerli testnet
    const entryPointAddr = "0x7eb6D1C6a5C0c30b97668FC391EC9f0e5250a816"
    const entryPoint = await ethers.getContractAt('EntryPoint', entryPointAddr)
    
    // Owner of TestExpiryAccount
    const owner = (await ethers.getSigners())[0]
    // Session Key Owners
    const signer_1 = new ethers.Wallet(`${process.env.TEST_ACCOUNT}`)
    const signer_2 = new ethers.Wallet(`${process.env.TEST_ACCOUNT_2}`)
    
    /*
    ==============Calling addTemporaryOwner() Function==============
    */
    
    
    //@dev Only needed at the first time, now commented out
    
    // console.log('Add temporary owner...')
    // let now = await ethers.provider.getBlock('latest').then(block => block.timestamp)

    // await addTempOwner(
    //   account,
    //   signer_1,
    //   now - 2000,
    //   now + 10000000 // Around November, 2023
    // )
    
    // await addTempOwner(
    //   account, 
    //   signer_2, 
    //   now - 2000, 
    //   now + 10000000 // Around November, 2023
    // )


    /*
    ==============Signing UserOp==============
    */
    
    console.log(`Testing UserOp signed by ${signer_1.address} and ${signer_2.address}...`)
    const successOp = await sign(account, signer_1, entryPoint, true)
    const failOp = await sign(account, signer_2, entryPoint, false)
    console.log('First user operation will succeed:', successOp)
    console.log('Second user operation will fail:', failOp)


    /*
    ==============Calling handleOps() through entrypoint==============
    */
    console.log("Calling handleOps() through entrypoint...")

    const tx1 = await entryPoint.handleOps([successOp], owner.address, {gasLimit: 10e6})
    await tx1.wait()
    console.log("Executing the first UserOp is completed at:", tx1.hash)

    // Will revert at this line
    // staticcall to see the specific revert reason
    await entryPoint.callStatic.handleOps([failOp], owner.address, {gasLimit: 10e6})
      .catch(error => {
          console.log("Transaction failed. Reverted reason:", error.errorArgs[1])
      })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });