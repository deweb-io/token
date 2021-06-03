/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('solidity-coverage');
require('hardhat-gas-reporter');
module.exports = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false
  }
}
