require('@nomiclabs/hardhat-etherscan');
require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-gas-reporter');
require('solidity-coverage');
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
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
        apiKey: '54S5K5ZUKCVMABUTIUGAZCYFN8FCFYSSKY'
    },
    networks: {
        hardhat: {
            chainId: 1337
        },
        // mainnet: {
        //     url: 'https://mainnet.infura.io/v3/b481942a6a15462988f7ab9000ca51ab',
        //     accounts: ['']
        // },
        rinkeby: {
            url: 'https://rinkeby.infura.io/v3/b481942a6a15462988f7ab9000ca51ab',
            accounts : ['0x3878a7de2d0cf3ca4c23c237ec5fd254edf73134dd83d1ef74efdba9855bdadd']
        },
        ropsten: {
            url: 'https://ropsten.infura.io/v3/b481942a6a15462988f7ab9000ca51ab',
            accounts : ['0xa54eb7f94dae3fdf83bdb0036eea1c673e824fc8109a70bdb6748adddffe3538']
        },
        bsc: {
            url: 'https://speedy-nodes-nyc.moralis.io/a3da30b163da6943583020d1/bsc/mainnet',
            accounts : ['0xc959a1091c5a4a52d838a7c7bcda2a9187043cddaae193d34ffbfbe4dd90fea0']
        },
        bsctest: {
            url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
            accounts : ['0xc959a1091c5a4a52d838a7c7bcda2a9187043cddaae193d34ffbfbe4dd90fea0']
        }
    }
};
