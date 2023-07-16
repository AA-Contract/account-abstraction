import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "dotenv/config";

const config: HardhatUserConfig = {
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
      accounts: [process.env.DEPLOYER!, process.env.USER1!, process.env.USER2!],
      chainId: 5,
    },
    hardhat: {
      blockGasLimit: 12000000,
    },
  },
  solidity: {
    version: "0.8.12",
    settings: {
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
};

export default config;
