import { BigNumber } from "ethers";
import { UserOperation } from "../test/UserOperation";
import _ from "lodash";
import { ethers } from "hardhat";

export function formatUserOperation(userOp: UserOperation) {
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

export async function sendUserOperation(userOp: UserOperation) {
  try {
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

    let resultString = JSON.stringify(result);
    let txHash = resultString.split('"')[3];
    let tx = await ethers.provider.getTransaction(txHash);
    await tx.wait();

    console.log("UserOperation submitted!\n", JSON.stringify(result));

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
