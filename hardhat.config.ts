import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "dotenv/config";

require("dotenv").config();

const optimizedComilerSettings = {
  version: "0.8.17",
  settings: {
    optimizer: { enabled: true, runs: 1000000 },
    viaIR: true,
  },
};

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          outputSelection: {
            "*": {
              "*": ["storageLayout"],
            },
          },
        },
      },
    ],
    overrides: {
      "contracts/core/EntryPoint.sol": optimizedComilerSettings,
      "contracts/samples/SimpleAccount.sol": optimizedComilerSettings,
      "contracts/test/TestExpiryAccount.sol": optimizedComilerSettings,
      "contracts/test/TestExpiryAccountFactory.sol": optimizedComilerSettings,
    },
  },
  namedAccounts: {
    deployer: 0,
    withdrawer: 1,
    user: 2,
  },
  networks: {
    development: {
      url: "http://127.0.0.1:8545",
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: process.env.INFURA_KEY,
      accounts: [
        process.env.DEPLOYER!,
        process.env.USER1!,
        process.env.USER2!,
        process.env.USER3!,
        process.env.USER4!,
      ],
      chainId: 5,
    },
    hardhat: {
      blockGasLimit: 12000000,
    },
  },
};

export default config;
