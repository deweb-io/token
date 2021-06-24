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
        rinkeby: {
            url: 'https://rinkeby.infura.io/v3/b481942a6a15462988f7ab9000ca51ab',
            // Public-key:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
            accounts : ['0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80']
        }
    }
};
