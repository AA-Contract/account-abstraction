import { getAccountInitCode, fund } from "../test/testutils";
import { ethers } from "hardhat";
import { fillAndSign } from "../test/UserOp";
import {
  TestAccount,
  EntryPoint,
  TestCounter,
  TestRecoveryToken,
  TestAccountFactory,
} from "../typechain";

import { BigNumber, Wallet } from "ethers";
import { UserOperation } from "../test/UserOperation";
import _, { floor } from "lodash";
import sign from "./signUserOp";

var entryPoint: EntryPoint;
var accountFactory: TestAccountFactory;
var account: TestAccount;
var recoveryToken: TestRecoveryToken;
var counter: TestCounter;
var userAccountContract: TestAccount;
var userAccountContractAddr: string;

var alice = new ethers.Wallet(process.env.USER1 as string, ethers.provider);
var bob = new ethers.Wallet(process.env.USER2 as string, ethers.provider);
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
  entryPoint = (await ethers.getContractAt(
    "EntryPoint",
    "0x7eb6D1C6a5C0c30b97668FC391EC9f0e5250a816"
  )) as EntryPoint;
  accountFactory = (await ethers.getContractAt(
    "TestAccountFactory",
    "0xd04C9074937f0aC17a53dE580a91D1C4CA69EB22"
  )) as TestAccountFactory;
  account = (await ethers.getContractAt(
    "TestAccount",
    await accountFactory.accountImplementation()
  )) as TestAccount;
  counter = (await ethers.getContractAt(
    "TestCounter",
    "0xe59C5DFE380cCcD122e16baF2379a5eed8540739"
  )) as TestCounter;

  userAccountContractAddr = await accountFactory.callStatic.createAccount(
    alice.address,
    337755
  ); // get SWC address by static call
  userAccountContract = (await ethers.getContractAt(
    "TestAccount",
    userAccountContractAddr
  )) as TestAccount;
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

  let result = _.mapKeys(userOp, function (value, key) {
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
      throw new Error(`Error! ${await response.text()}`);
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
  console.log("        [Deploy Smart Wallet]        \n");

  console.log(`Smart Wallet Address: ${userAccountContractAddr}`);
  console.log(`\nOwner : ${alice.address}`);

  let balance = await ethers.provider.getBalance(userAccountContractAddr);
  console.log("Wallet Balance :", balance);
  if (balance < ethers.utils.parseEther("0.1")) {
    await fund(userAccountContractAddr);
  }
  const testInitCode = getAccountInitCode(
    alice.address,
    accountFactory,
    337755
  );
  const deployAccountUserOp = await fillAndSign(
    {
      sender: userAccountContractAddr,
      verificationGasLimit: 10e6,
      initCode: testInitCode,
      callGasLimit: 10e6,
    },
    alice,
    entryPoint
  );

  const tx = await entryPoint.handleOps([deployAccountUserOp], alice.address);
  console.log("📌 Deploy CA Wallet (initial tx): ", tx.hash);
  await tx.wait();
  console.log("\n");
}

async function registerGuardian() {
  console.log("        [Setting Social Recovery]        \n");

  await userAccountContract
    .connect(alice)
    .setGuardianMaxSupply(3)
    .then(async (tx) => {
      console.log("1. Set Max Guardian: ", tx.hash);
      await tx.wait();
    });
  await userAccountContract
    .connect(alice)
    .setTimeInterval(1)
    .then(async (tx) => {
      console.log("2. Set Time Interval: ", tx.hash);
      await tx.wait();
    });

  console.log("\n");
  console.log("        [Register Guardian]        \n");
  recoveryToken = (await ethers.getContractAt(
    "TestRecoveryToken",
    await userAccountContract.recoveryToken()
  )) as TestRecoveryToken;
  console.log("Wallet's Social Recovery Token :", recoveryToken.address);

  await userAccountContract
    .connect(alice)
    .registerGuardian(
      [guardian1.address, guardian2.address, guardian3.address],
      2
    )
    .then(async (tx) => {
      console.log("Mint Recovery Token to Guardian ...\n", tx.hash);
      await tx.wait();
    });

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
  console.log("Change CA wallet owner from Alice to Bob ... \n");
  await recoveryToken
    .connect(guardian1)
    .confirmRecovery(bob.address)
    .then(async (tx) => {
      console.log("guardian 1 confirmed recovery...");
      await tx.wait();
    })
    .catch(() => {
      console.log("guardian 1 already confirmed...");
    });

  await recoveryToken
    .connect(guardian2)
    .confirmRecovery(bob.address, {})
    .then(async (tx) => {
      console.log("guardian 2 confirmed recovery...");
      await tx.wait();
    })
    .catch(() => {
      console.log("guardian 3 already confirmed...");
    });
  await recoveryToken
    .connect(guardian3)
    .confirmRecovery(bob.address, {})
    .then(async (tx) => {
      console.log("guardian 3 confirmed recovery...");
      await tx.wait();
    })
    .catch(() => {
      console.log("guardian 3 already confirmed...");
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

  //await sendUserOperation(testUserOp);
  await entryPoint
    .handleOps([testUserOp], alice.address)
    .then(async (tx) => {
      console.log("tx: ", tx.hash);
      await tx.wait();
    })
    .catch((e) => {
      console.log(e);
    });

  const afterCounter = await counter.counters(userAccountContractAddr);
  console.log(`Counter value changed: ${beforeCounter} -> ${afterCounter}\n`);
}

async function addTempOwner(owner: Wallet, temporaryOwner: Wallet) {
  console.log("\n        [Add Temporary Owner]        ");
  let now = await ethers.provider
    .getBlock("latest")
    .then((block) => block.timestamp);

  console.log("\nAdd temporary owner... ('count' method)");
  const count = counter.interface.encodeFunctionData("count");
  const targetMethods: TestAccount.TargetMethodsStruct[] = [
    {
      delegatedContract: counter.address,
      delegatedFunctions: [count],
    },
  ];

  const tx = await userAccountContract
    .connect(owner)
    .addTemporaryOwner(
      temporaryOwner.address,
      now - 2000,
      now + 10000000,
      targetMethods,
      {}
    );
  await tx.wait();
  console.log(`Added ${temporaryOwner.address}\ntx hash is:`, tx.hash);

  console.log("\nOwner List");
  console.log(
    `1. ${alice.address}(🤴) : ${formatDate(now - 2000)} ~ ${formatDate(
      now + 10000000
    )}`
  );
}

async function sendCountTx(TemporaryOwner: Wallet) {
  console.log("\n        [Test Temporary Owner: send 'count' tx]        ");
  const successOp = await sign(
    userAccountContract,
    TemporaryOwner,
    entryPoint,
    true
  );

  console.log("\nSend user opeartion to counter contract...");
  console.log(
    `sender: ${successOp.sender}, signer: ${TemporaryOwner.address} (🤴)`
  );

  const beforeCounter = await counter.counters(userAccountContractAddr);
  //await sendUserOperation(successOp);
  await entryPoint
    .handleOps([successOp], alice.address)
    .then(async (tx) => {
      console.log("tx: ", tx.hash);
      await tx.wait();
    })
    .catch((e) => {
      console.log(e);
    });
  const afterCounter = await counter.counters(userAccountContractAddr);
  console.log(`Counter value changed: ${beforeCounter} -> ${afterCounter}\n`);
}

load().then(async () => {
  console.log("*********************************************");
  console.log("\n          🔐  Social Reovery Test  🔐         \n");
  console.log("*********************************************\n");

  console.log("Sender: ", userAccountContractAddr);

  console.log("Alice 🤴: ", alice.address);
  console.log("Bob 🙎: ", bob.address);
  console.log("\n");

  deployAccount().then(async () => {
    console.log("\n");
    console.log(
      "        [Send User Operation With Original Owner Alice (🤴)]        \n"
    );

    await checkOperation(alice);
    await registerGuardian();
    confirmReocovery().then(async () => {
      console.log("\n");
      console.log("        [Recover Wallet]        \n");
      const oldOwnerAddress = await userAccountContract.owner();
      await userAccountContract.recoveryWallet(bob.address).then(async (tx) => {
        console.log("Send transaction for recovery...");
        console.log("tx hash: ", tx.hash);
        await tx.wait();
      });
      console.log("\n ✨[Wallet owner changed]✨ \n");
      console.log(`${oldOwnerAddress}(🤴) -> ${bob.address}(🙎)`);

      console.log("\n");
      console.log(
        "        [Send User Operation With New Owner Bob (🙎)]        \n"
      );
      await checkOperation(bob);

      console.log("\n");
      console.log(
        "       🚫[Send User Operation With Original Owner: must revert (🤴)]🚫         \n"
      );
      await checkOperation(alice);

      console.log("*********************************************\n");
      console.log("            ⏳  Session Key Test  ⏳          ");
      console.log("\n*********************************************\n");

      console.log("Alice 🤴: ", alice.address);
      console.log("Bob 🙎: ", bob.address);
      addTempOwner(bob, alice).then(async () => {
        await sendCountTx(alice);
      });
    });
  });
  return;
});

function formatDate(s: number) {
  const date = new Date(1970, 0, 1);
  date.setSeconds(s);

  return (
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate()),
    ].join("-") +
    " " +
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds()),
    ].join(":")
  );
}

function padTo2Digits(num: number) {
  return num.toString().padStart(2, "0");
}
