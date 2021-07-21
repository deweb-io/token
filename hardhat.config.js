/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('@nomiclabs/hardhat-etherscan');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-gas-reporter');
require('solidity-coverage');
module.exports = {
    solidity: {
        version: '0.8.6',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    gasReporter: {
        enabled: (process.env.REPORT_GAS) ? true : false
    },
    etherscan: {
        apiKey: 'ETHERSCAN_API_KEY'
    },
    networks: {
        ropsten: {
            url: 'https://ropsten.infura.io/v3/b481942a6a15462988f7ab9000ca51ab',
            // Public-key:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
            accounts : ['0xa54eb7f94dae3fdf83bdb0036eea1c673e824fc8109a70bdb6748adddffe3538']
        },
        localhost: {
            url: 'http://127.0.0.1:8545',
            accounts : ['0x0000000000000000000000000000000000000000000000000000000000000001']
        }
    }
};
