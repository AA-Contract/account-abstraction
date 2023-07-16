import { getAccountInitCode, fund } from "./test/testutils";
import { ethers } from "hardhat";
import { fillAndSign } from "./test/UserOp";
import {
  TestSocialRecoveryAccount,
  EntryPoint,
  TestCounter,
  TestRecoveryToken,
  TestSocialRecoveryAccountFactory,
} from "./typechain";
import { expect } from "chai";
import { Wallet } from "ethers";

var entryPoint: EntryPoint;
var accountFactory: TestSocialRecoveryAccountFactory;
var account: TestSocialRecoveryAccount;
var recoveryToken: TestRecoveryToken;
var counter: TestCounter;
var userAccountContract: TestSocialRecoveryAccount;
var userAccountContractAddr: string;

const user = new ethers.Wallet('c5e460632f7d1017bef6b4e8806632ac3ca78c91fa2ce4ea5dc7d25d018e3176', ethers.provider);
const newOwner = new ethers.Wallet('83f478e253a4c2377c37b4f73b10f3bcd4afa92878ac8e9233646dad2fb1d933',
  ethers.provider
);
const guardian1 = new ethers.Wallet(
  '0e529fdef8aa7f141189fe11bbb575dde4f6e3606ee39db4396c59947dc64fc4',
  ethers.provider
);
const guardian2 = new ethers.Wallet(
  '56ccb2d19ab9a294d5a7566be40c5d86492949c86ddf7c53ec5d97e21d6e852a',
  ethers.provider
);
const guardian3 = new ethers.Wallet(
  '5a43cf7487bd1420f32b64bdd5ead92ae2638cf8464c110cc1982e024395a580',
  ethers.provider
);

async function load() {
  entryPoint = await ethers.getContractAt(
    "EntryPoint",
    "0x7eb6D1C6a5C0c30b97668FC391EC9f0e5250a816"
  );
  accountFactory = await ethers.getContractAt(
    "TestSocialRecoveryAccountFactory",
    "0x0f3B1FcFdED9Efbaa9A26C746D06cb65c047160C"
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
//const refundAccount = (await ethers.getSigners())[0];
  const testInitCode = getAccountInitCode(user.address, accountFactory, 104);

  userAccountContract = await ethers.getContractAt(
    "TestSocialRecoveryAccount",
    userAccountContractAddr
  );

//@ 
  console.log("==== funding .... ====");
  const funding = await user.sendTransaction({
    from: user.address,
    to: userAccountContractAddr,
    value: ethers.utils.parseEther('0.2')
  });

  await funding.wait();
//@

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
  const result = await entryPoint.callStatic.handleOps(
    [testUserOp],
    user.address
  );

  console.log(result);
  const tx = await entryPoint.handleOps([testUserOp], user.address);
  await tx.wait();
  console.log(tx.hash);

  userAccountContract = await ethers.getContractAt(
    "TestSocialRecoveryAccount",
    userAccountContractAddr
  );

  console.log("==== setting recovery ... ====");
  await userAccountContract
    .connect(user)
    .setGuardianMaxSupply(3)
    .then(async (tx) => tx.wait());
  await userAccountContract
    .connect(user)
    .setTimeInterval(1)
    .then(async (tx) => tx.wait());

  console.log("==== register guardain ... ====");
  await userAccountContract
    .connect(user)
    .registerGuardian(
      [guardian1.address, guardian2.address, guardian3.address],
      2
    )
    .then(async (tx) => tx.wait());

  recoveryToken = await ethers.getContractAt(
    "TestRecoveryToken",
    await userAccountContract.recoveryToken()
  );
  
  //@
  console.log(recoveryToken.address)
  //@
}

//@
async function confirmReocovery() {
  const token = await ethers.getContractAt('TestRecoveryToken', recoveryToken.address);

  console.log("==== confirm recover ... ====");
  await token
    .connect(guardian1)
    .confirmReocovery(newOwner.address, {gasLimit : 10e6})
    .then(async (tx) => tx.wait());
  await token
    .connect(guardian2)
    .confirmReocovery(newOwner.address, {gasLimit : 10e6})
    .then(async (tx) => tx.wait());
  await token
    .connect(guardian3)
    .confirmReocovery(newOwner.address, {gasLimit : 10e6})
    .then(async (tx) => tx.wait());
}
//@

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
  await tx.wait();
  console.log(tx.hash);
  const afterCounter = await counter.counters(userAccountContractAddr);
//@
  console.log(afterCounter.sub(beforeCounter)); 
//@
}

load().then(async () => {
  userAccountContractAddr = await accountFactory.callStatic.createAccount(
    user.address,
    104
  ); // get SWC address by static call

  console.log("Sender: ", userAccountContractAddr);

  deployAccount().then(async () => {
    await checkOperation(user);
    expect(await userAccountContract.owner()).to.be.equal(user.address);
    expect(await recoveryToken.getNonce()).to.be.equal(0);
    confirmReocovery().then(async () => {
      await userAccountContract
        .recoveryWallet(newOwner.address)
        .then(async (tx) => {
          await tx.wait();
          console.log("=== Recovery wallet ... ===");
        });
      expect(await userAccountContract.owner()).to.be.equal(newOwner.address);
      expect(await recoveryToken.getNonce()).to.be.equal(1);
      await checkOperation(newOwner);
    });
  });
  return;
});
