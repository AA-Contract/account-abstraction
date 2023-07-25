// Just Used for the first time
import { ethers } from 'hardhat'
import { TestExpiryAccountFactory__factory } from '../typechain'

async function main() {
    const hre = require('hardhat')
    // Entrypoint contract hardcoded
    const entryPointAddr = "0x7eb6D1C6a5C0c30b97668FC391EC9f0e5250a816"
    const owner = (await ethers.getSigners())[0] 
    console.log("The deployer is:", owner.address)

    console.log("Deploying TestExpiryAccountFactory...")

    const AccountFactory: TestExpiryAccountFactory__factory = await hre.ethers.getContractFactory('TestExpiryAccountFactory')
    const accountFactory = await AccountFactory.connect(owner).deploy(entryPointAddr)
    await accountFactory.deployed()
    console.log("Factory Deployed at: ", accountFactory.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });