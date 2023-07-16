import { getAccountInitCode, fund } from "../test/testutils";
import { ethers } from "hardhat";
import { fillAndSign } from "../test/UserOp";
import {
  TestSocialRecoveryAccount,
  EntryPoint,
  TestCounter,
  TestRecoveryToken,
  TestSocialRecoveryAccountFactory,
} from "../typechain";
import { expect } from "chai";
import { Wallet } from "ethers";

var entryPoint: EntryPoint;
var accountFactory: TestSocialRecoveryAccountFactory;
var account: TestSocialRecoveryAccount;
var recoveryToken: TestRecoveryToken;
var counter: TestCounter;
var userAccountContract: TestSocialRecoveryAccount;
var userAccountContractAddr: string;

const user = new ethers.Wallet(process.env.USER1 as string, ethers.provider);
const newOwner = new ethers.Wallet(
  process.env.USER2 as string,
  ethers.provider
);
const guardian1 = new ethers.Wallet(
  process.env.USER3 as string,
  ethers.provider
);
const guardian2 = new ethers.Wallet(
  process.env.USER4 as string,
  ethers.provider
);
const guardian3 = new ethers.Wallet(
  process.env.DEPLOYER as string,
  ethers.provider
);

async function load() {
  entryPoint = await ethers.getContractAt(
    "EntryPoint",
    "0x7eb6D1C6a5C0c30b97668FC391EC9f0e5250a816"
  );
  accountFactory = await ethers.getContractAt(
    "TestSocialRecoveryAccountFactory",
    "0x3564d41e9bb82c9472F656fE704E58B737751C30"
  );
  account = await ethers.getContractAt(
    "TestSocialRecoveryAccount",
    await accountFactory.accountImplementation()
  );
  counter = await ethers.getContractAt(
    "TestCounter",
    "0xe59C5DFE380cCcD122e16baF2379a5eed8540739"
  );
}

async function deployAccount() {
  const refundAccount = (await ethers.getSigners())[0];
  const testInitCode = getAccountInitCode(user.address, accountFactory, 333);

  userAccountContract = await ethers.getContractAt(
    "TestSocialRecoveryAccount",
    userAccountContractAddr
  );

  console.log("==== funding .... ====");
  //await fund(userAccountContractAddr); //depoist 0.3 ETH to SCW

  const testUserOp = await fillAndSign(
    {
      sender: userAccountContractAddr,
      verificationGasLimit: 10e6,
      initCode: testInitCode,
      callGasLimit: 10e6,
    },
    user,
    entryPoint
  );

  console.log("==== deploy SCW ====");
  // const tx = await entryPoint.handleOps([testUserOp], refundAccount.address);
  // console.log("tx :", tx.hash);
  // await tx.wait();

  userAccountContract = await ethers.getContractAt(
    "TestSocialRecoveryAccount",
    userAccountContractAddr
  );

  console.log("==== setting recovery ... ====");
  // await userAccountContract
  //   .connect(user)
  //   .setGuardianMaxSupply(3)
  //   .then(async (tx) => {
  //     console.log("tx :", tx.hash);
  //     await tx.wait();
  //   });
  // await userAccountContract
  //   .connect(user)
  //   .setTimeInterval(1)
  //   .then(async (tx) => {
  //     console.log("tx :", tx.hash);
  //     await tx.wait();
  //   });

  console.log("==== register guardain ... ====");
  // await userAccountContract
  //   .connect(user)
  //   .registerGuardian(
  //     [guardian1.address, guardian2.address, guardian3.address],
  //     2
  //   )
  //   .then(async (tx) => {
  //     console.log("tx :", tx.hash);
  //     await tx.wait();
  //   });
  recoveryToken = await ethers.getContractAt(
    "TestRecoveryToken",
    await userAccountContract.recoveryToken()
  );
}

async function confirmReocovery() {
  console.log("==== confirm recovery ... ====");
  await recoveryToken
    .connect(guardian1)
    .confirmRecovery(newOwner.address)
    .then(async (tx) => {
      console.log("tx :", tx.hash);
      await tx.wait();
    });
  await recoveryToken
    .connect(guardian2)
    .confirmRecovery(newOwner.address)
    .then(async (tx) => {
      console.log("tx :", tx.hash);
      await tx.wait();
    });
  await recoveryToken
    .connect(guardian3)
    .confirmRecovery(newOwner.address)
    .then(async (tx) => {
      console.log("tx :", tx.hash);
      await tx.wait();
    });
}

async function checkOperation(owner: Wallet) {
  const refundAccount = (await ethers.getSigners())[0];
  const userAccountContract = await ethers.getContractAt(
    "TestSocialRecoveryAccount",
    userAccountContractAddr
  );
  const nonce = await userAccountContract.getNonce();
  const count = counter.interface.encodeFunctionData("count");
  const testCalldataCounter = account.interface.encodeFunctionData("execute", [
    counter.address,
    0,
    count,
  ]);

  console.log("nonce", nonce);
  const testUserOp = await fillAndSign(
    {
      sender: userAccountContractAddr,
      nonce: nonce,
      verificationGasLimit: 10e5,
      callData: testCalldataCounter,
      callGasLimit: 10e5,
    },
    owner,
    entryPoint
  );

  console.log("==== check operation ... ====");
  console.log(testUserOp);
  const beforeCounter = await counter.counters(userAccountContractAddr);
  const tx = await entryPoint.handleOps([testUserOp], refundAccount.address);
  console.log("tx :", tx.hash);
  await tx.wait();
  const afterCounter = await counter.counters(userAccountContractAddr);

  expect(afterCounter.sub(beforeCounter)).to.be.equal(1);
}

load().then(async () => {
  userAccountContractAddr = await accountFactory.callStatic.createAccount(
    user.address,
    333
  ); // get SWC address by static call

  console.log("Sender: ", userAccountContractAddr);

  deployAccount().then(async () => {
    await checkOperation(user);
    expect(await userAccountContract.owner()).to.be.equal(user.address);
    expect(await recoveryToken.getNonce()).to.be.equal(0);
    confirmReocovery().then(async () => {
      console.log("=== Recovery wallet ... ===");
      await userAccountContract
        .recoveryWallet(newOwner.address)
        .then(async (tx) => {
          console.log("tx :", tx.hash);
          await tx.wait();
        });
      expect(await userAccountContract.owner()).to.be.equal(newOwner.address);
      expect(await recoveryToken.getNonce()).to.be.equal(1);
      await checkOperation(newOwner);
    });
  });
  return;
});
