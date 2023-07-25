//deploy Entrypoint and TestSocialRecoveryAccountFactory
import { ethers } from 'hardhat'

async function main() {
  console.log("deploy start")

  const network = await ethers.provider.getNetwork()
  console.log("Network:", network.name)

  const EntryPointFactory = await ethers.getContractFactory('EntryPoint')
  const AccountFactory = await ethers.getContractFactory('TestSocialRecoveryAccountFactory')
  

  console.log('Deploying EntryPoint')
  const entryPoint = await EntryPointFactory.deploy( {gasLimit: 10e6})
  await entryPoint.deployed()
  console.log('EntryPoint deployed at:', entryPoint.address)
  const entryPointAddr = entryPoint.address

  console.log('Deploying AccountFactory...')
  const accountFactory = await AccountFactory.deploy(entryPointAddr, {gasLimit: 10e6})
  await accountFactory.deployed()
  console.log('AccountFactory deployed at:', accountFactory.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
