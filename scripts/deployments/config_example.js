/**
 * Copy this file to config.js before using.
 */
module.exports = {
    network: 'ropsten', // For etherscan verification
    bridge: {
        maxLockLimit : '40000000000000000000000',
        maxReleaseLimit: '80000000000000000000000',
        minLimit: '1000000000000000000',
        limitIncPerBlock: '500000000000000000000',
        minRequiredReports: 1,
        commissionAmount: '0',
        reporters: {
            addresses: ['0x70997970c51812dc3a010c7d01b50e0d17dc79c8'],
            active: [true]
        }
    },
    mint: {
        day1: {
            amount: '500000',
            to: '0xFffaDB2C046148f37d330406ae365ff2797D13D8'
        },
        day3: {
            amount: '900000',
            to: '0xD9241a18C21505C436412e8a93A70Bb6e3dcd697'
        },
        safeAddress: '0xE01b6a22c3F1C486181A39442A1D4924730005c8',
        totalSupply: '1000000000',
    },
    rewards: {
        quartes: [0],
        amount: '1000000'
    }
}

