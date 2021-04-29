/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('@openzeppelin/hardhat-upgrades');
require('@openzeppelin/test-helpers');
require('@nomiclabs/hardhat-ganache');
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            loggingEnabled: false
        }
    },
    solidity: {
        compilers: [
             {
                 version: "0.7.3"
             },
             {
                 version: "0.6.12"
             }
        ]
    }
};
