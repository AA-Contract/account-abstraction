// Deploying TestExpiryAccount, Will be used only once.
import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { TestExpiryAccountFactory } from '../typechain'

const hre: HardhatRuntimeEnvironment = require("hardhat")


async function main() {
    // Account Owner
    const owner = (await ethers.getSigners())[0].address 
    // Salt at create2. Should modify it every time testing 
    const salt = 5249

    /*
    ==============Bringing Account Factory==============
    */
    console.log("deploy start")
    
    console.log("The deployer is:", owner)
   
    console.log('Bringing TestExpiryAccountFactory...')
    // Already deployed TestExpiryAccountFactory
    const accountFactory: TestExpiryAccountFactory = await ethers.getContractAt(
      'TestExpiryAccountFactory',
      "0xFF27D44FDF2c39E6CEBE44B1cEC168b579a6607E"
    )
    console.log("Brought accountFactory at", accountFactory.address)
    
    /*
    ==============Deploying Account By calling AccountFactory directly==============
    */
    

    console.log('Deploying TestExpiryAccount...')
    const tx = await accountFactory.createAccount(owner, salt)
    await tx.wait()
    const accountAddress = await accountFactory.callStatic.getAddress(owner, salt)
    console.log('TestExpiryAccount Deployed', accountAddress)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });