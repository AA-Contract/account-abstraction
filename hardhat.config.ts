import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "dotenv/config";

const config: HardhatUserConfig = {
  

const optimizedComilerSettings = {
  version: '0.8.17',
  settings: {
    optimizer: { enabled: true, runs: 1000000 },
    viaIR: true
  }
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{
      version: '0.8.17',
      settings: {
        optimizer: { enabled: true, runs: 1000000 }
      }
    }],
    overrides: {
      'contracts/core/EntryPoint.sol': optimizedComilerSettings,
      'contracts/samples/SimpleAccount.sol': optimizedComilerSettings,
      'contracts/test/TestExpiryAccount.sol': optimizedComilerSettings,
      'contracts/test/TestExpiryAccountFactory.sol': optimizedComilerSettings
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
        process.env.DEPLOYER_SOCIAL!,
        process.env.USER1!,
        process.env.USER2!,
      ],
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

// coverage chokes on the "compilers" settings
if (process.env.COVERAGE != null) {
  // @ts-ignore
  config.solidity = config.solidity.compilers[0]
}

export default config

