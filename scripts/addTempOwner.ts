import { ethers } from "hardhat";
import { TestExpiryAccount } from "../typechain";
import { Wallet } from "ethers";

async function addTempOwner(
  account: TestExpiryAccount,
  signer: Wallet,
  validAfter: number,
  validUntil: number
) {
  /*
    ========Add session key to wallet with given time range========
    */

  // const owner = (await ethers.getSigners())[0];
  const owner = new ethers.Wallet(
    process.env.DEPLOYER_SESSION!,
    ethers.provider
  );

  // Used TestCounter Contract as a target method
  const counter = await ethers.getContractAt(
    "TestCounter",
    "0x3918E00482b2C5F3f25beD0981a694f64B2281DE"
  );
  const count = counter.interface.encodeFunctionData("count");
  const targetMethods: TestExpiryAccount.TargetMethodsStruct[] = [
    {
      delegatedContract: counter.address,
      delegatedFunctions: [count],
    },
  ];

  const tx = await account
    .connect(owner)
    .addTemporaryOwner(signer.address, validAfter, validUntil, targetMethods);
  await tx.wait();
  console.log(`Added ${signer.address}\ntx hash is:`, tx.hash);
}

export default addTempOwner;
