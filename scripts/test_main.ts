// To get full UserOp from given TestExpiryAccount and tempOwner
import { ethers } from "hardhat";
import addTempOwner from "./addTempOwner";
import sign from "./signUserOp";
import { sendUserOperation } from "./bundlerUtils";

function padTo2Digits(num: number) {
  return num.toString().padStart(2, "0");
}

// 👇️ format as "YYYY-MM-DD hh:mm:ss"
// You can tweak the format easily
function formatDate(ms: number) {
  const date = new Date(ms);
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
async function main() {
  console.log("*********************************************\n");
  console.log("            ⏳  Session Key Test  ⏳          ");
  console.log("\n*********************************************\n");
  // Hardcoded TestExpiryAccount address
  const account = await ethers.getContractAt(
    "TestExpiryAccount",
    "0x3eB48129c1B3E2f8022C4177a8329c7DFEf45f99"
  );
  // Global Entrypoint contract for goerli testnet
  const entryPointAddr = "0x7eb6D1C6a5C0c30b97668FC391EC9f0e5250a816";
  const entryPoint = await ethers.getContractAt("EntryPoint", entryPointAddr);

  // Owner of TestExpiryAccount
  const owner = (await ethers.getSigners())[0];
  // Session Key Owners
  const signer_1 = new ethers.Wallet(`${process.env.TEST_ACCOUNT}`);
  const signer_2 = new ethers.Wallet(`${process.env.TEST_ACCOUNT_2}`);

  /*
    ==============Calling addTemporaryOwner() Function==============
    */

  //@dev Only needed at the first time, now commented out

  console.log("\n        [Add Temporary Owner]        ");
  let now = await ethers.provider
    .getBlock("latest")
    .then((block) => block.timestamp);

  console.log("\nAdd temporary owner... ('count' method)");

  await addTempOwner(
    account,
    signer_1,
    now - 2000,
    now + 10000000 // Around November, 2023
  );

  await addTempOwner(
    account,
    signer_2,
    now - 2000,
    now + 10000000 // Around November, 2023
  );

  console.log("\nOwner List");
  console.log(
    `1. ${signer_1.address} : ${formatDate(now - 2000)} ~ ${formatDate(
      now + 10000000
    )}`
  );
  console.log(
    `2. ${signer_2.address} : ${formatDate(now - 2000)} ~ ${formatDate(
      now + 10000000
    )}`
  );

  /*
    ==============Send Count Transaction==============
    */

  console.log("\n        [Test Temporary Owner: send 'count' tx]        ");
  const successOp = await sign(account, signer_1, entryPoint, true);

  console.log("\nSend transaction to counter contract...");
  await sendUserOperation(successOp);

  console.log("\n        [Test Temporary Owner: send 'justemit' tx]        ");
  const failOp = await sign(account, signer_2, entryPoint, false);

  console.log("\nSend transaction to counter contract...");
  await sendUserOperation(successOp);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
