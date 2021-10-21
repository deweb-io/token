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
        amount: '500000000',
        to: '0x44569Aa35Ff6d97e6531880712a41D2af72a007C' // BBS TOKEN deployer address
    },
    rewards: {
        quartes: [0],
        amount: '10000'
    }
}

