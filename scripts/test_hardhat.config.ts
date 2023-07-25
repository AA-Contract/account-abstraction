import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import { HardhatUserConfig } from 'hardhat/config'
import 'hardhat-deploy'
import 'solidity-coverage'


const optimizedComilerSettings = {
  version: '0.8.17',
  settings: {
    optimizer: { enabled: true, runs: 1000000 },
    viaIR: true
  }
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{
      version: '0.8.15',
      settings: {
        optimizer: { enabled: true, runs: 1000000 }
      }
    }],
    overrides: {
      'contracts/core/EntryPoint.sol': optimizedComilerSettings,
      'contracts/samples/SimpleAccount.sol': optimizedComilerSettings,
      'contracts/test/TestSocialRecoveryAccount.sol': optimizedComilerSettings
    }
  },
  networks: {
    goerli: {
        url: `https://goerli.infura.io/v3/e9dec7b328d0470683c440c0ca3d7b0e`,
        accounts: ['c5e460632f7d1017bef6b4e8806632ac3ca78c91fa2ce4ea5dc7d25d018e3176'],
        chainId: 5,
      }
  }
}

export default config
