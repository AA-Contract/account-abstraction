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
import { BigNumber, Wallet } from "ethers";
import { UserOperation } from "../test/UserOperation";
import _, { floor } from "lodash";

var entryPoint: EntryPoint;
var accountFactory: TestSocialRecoveryAccountFactory;
var account: TestSocialRecoveryAccount;
var recoveryToken: TestRecoveryToken;
var counter: TestCounter;
var userAccountContract: TestSocialRecoveryAccount;
var userAccountContractAddr: string;

var user = new ethers.Wallet(process.env.USER1 as string, ethers.provider);
var newOwner = new ethers.Wallet(process.env.USER2 as string, ethers.provider);
const guardian1 = new ethers.Wallet(
  process.env.USER3 as string,
  ethers.provider
);
const guardian2 = new ethers.Wallet(
  process.env.USER4 as string,
  ethers.provider
);
const guardian3 = new ethers.Wallet(
  process.env.USER5 as string,
  ethers.provider
);

async function load() {
  entryPoint = (await ethers.getContractAt(
    "EntryPoint",
    "0x7eb6D1C6a5C0c30b97668FC391EC9f0e5250a816"
  )) as EntryPoint;
  accountFactory = (await ethers.getContractAt(
    "TestSocialRecoveryAccountFactory",
    "0x3564d41e9bb82c9472F656fE704E58B737751C30"
  )) as TestSocialRecoveryAccountFactory;
  account = (await ethers.getContractAt(
    "TestSocialRecoveryAccount",
    await accountFactory.accountImplementation()
  )) as TestSocialRecoveryAccount;
  counter = (await ethers.getContractAt(
    "TestCounter",
    "0xe59C5DFE380cCcD122e16baF2379a5eed8540739"
  )) as TestCounter;
  userAccountContract = (await ethers.getContractAt(
    "TestSocialRecoveryAccount",
    "0x095A43A0448C948108fb2eDb69eb4e179f35B786"
  )) as TestSocialRecoveryAccount;
  userAccountContractAddr = userAccountContract.address;
  recoveryToken = (await ethers.getContractAt(
    "TestRecoveryToken",
    await userAccountContract.recoveryToken()
  )) as TestRecoveryToken;

  let userAddr = await userAccountContract.owner();
  if (userAddr != user.address) {
    let tmp = user;
    user = newOwner;
    newOwner = tmp;
  }
}

function formatUserOperation(userOp: UserOperation) {
  userOp.nonce = BigNumber.from(userOp.nonce).toHexString();
  userOp.callGasLimit = BigNumber.from(userOp.callGasLimit).toHexString();
  userOp.verificationGasLimit = BigNumber.from(
    userOp.verificationGasLimit
  ).toHexString();
  userOp.preVerificationGas = BigNumber.from(
    userOp.preVerificationGas
  ).toHexString();
  userOp.maxFeePerGas = BigNumber.from(userOp.maxFeePerGas).toHexString();
  userOp.maxPriorityFeePerGas = BigNumber.from(
    userOp.maxPriorityFeePerGas
  ).toHexString();

  let result = _.mapKeys(userOp, function(value, key) {
    return _.snakeCase(key);
  });
  return JSON.stringify(result);
}

async function sendUserOperation(userOp: UserOperation) {
  try {
    // uncomment below to print user operation
    // console.log(formatUserOperation(userOp));
    const response = await fetch(
      `http://localhost:8000/api/v1/user-ops/0x7eb6D1C6a5C0c30b97668FC391EC9f0e5250a816`,
      {
        method: "post",
        body: formatUserOperation(userOp),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error! status: ${await response.text()}`);
    }

    const result = await response.json();

    console.log("UserOperation submitted!\n", JSON.stringify(result));

    let resultString = JSON.stringify(result);
    let txHash = resultString.split('"')[3];
    let tx = await ethers.provider.getTransaction(txHash);
    await tx.wait();

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.log("error message: ", error.message);
      return error.message;
    } else {
      console.log("unexpected error: ", error);
      return "An unexpected error occurred";
    }
  }
}

async function deployAccount() {
  console.log("        [Set Social Recovery Wallet]        \n");

  console.log(`\nSocial recovery wallet : ${userAccountContractAddr}`);
  console.log(`Owner : ${user.address}`);

  let balance = await ethers.provider.getBalance(userAccountContractAddr);
  if (balance < ethers.utils.parseEther("0.1")) {
    console.log("Wallet balance :", balance);
    await fund(userAccountContractAddr);
  }

  console.log("\n");
  console.log("        [Register Guardian]        \n");

  let isGuardian1 = (
    await recoveryToken.callStatic.isGuardian(guardian1.address)
  ).lt(ethers.constants.MaxUint256);
  let isGuardian2 = (
    await recoveryToken.callStatic.isGuardian(guardian2.address)
  ).lt(ethers.constants.MaxUint256);
  let isGuardian3 = (
    await recoveryToken.callStatic.isGuardian(guardian3.address)
  ).lt(ethers.constants.MaxUint256);

  console.log("\nGuardian list");
  console.log("1. ", guardian1.address, ": ", isGuardian1);
  console.log("2. ", guardian2.address, ": ", isGuardian2);
  console.log("3. ", guardian3.address, ": ", isGuardian3);
}

async function confirmReocovery() {
  console.log("\n");
  console.log("        [Confirm Recovery]        \n");
  await recoveryToken
    .connect(guardian1)
    .confirmRecovery(newOwner.address)
    .then(async (tx) => {
      console.log("guardian 1 confirmed recovery...");
      await tx.wait();
    });
  await recoveryToken
    .connect(guardian2)
    .confirmRecovery(newOwner.address)
    .then(async (tx) => {
      console.log("guardian 2 confirmed recovery...");
      await tx.wait();
    });
  await recoveryToken
    .connect(guardian3)
    .confirmRecovery(newOwner.address)
    .then(async (tx) => {
      console.log("guardian 3 confirmed recovery...");
      await tx.wait();
    });
}

async function checkOperation(owner: Wallet) {
  const beforeCounter = await counter.counters(userAccountContractAddr);
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

  console.log("Send user operation to counter contract...");
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

  await sendUserOperation(testUserOp);

  const afterCounter = await counter.counters(userAccountContractAddr);
  console.log(`Counter value changed: ${beforeCounter} -> ${afterCounter}`);
}

load().then(async () => {
  console.log("*********************************************");
  console.log("\n          🔐  Social Reovery Test  🔐         \n");
  console.log("*********************************************\n");

  // console.log("Sender: ", userAccountContractAddr);

  deployAccount().then(async () => {
    console.log("\n");
    console.log("        [Send User Operation With Original Owner]        \n");

    await checkOperation(user);
    confirmReocovery().then(async () => {
      console.log("\n");
      console.log("        [Recover Wallet]        \n");
      const oldOwnerAddress = await userAccountContract.owner();
      await userAccountContract
        .recoveryWallet(newOwner.address)
        .then(async (tx) => {
          console.log("Send transaction for recovery...");
          await tx.wait();
        });
      console.log("Wallet owner changed!");
      console.log(`${oldOwnerAddress} -> ${newOwner.address}`);

      console.log("\n");
      console.log("        [Send User Operation With New Owner]        \n");
      await checkOperation(newOwner);
    });
  });
  return;
});
