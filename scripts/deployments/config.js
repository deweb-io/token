module.exports = {
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
        amount: '100',
        to: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' //BBS TOKEN deployer address
    },
    rewards: {
        quartes: [0, 1, 2, 3, 4],
        amount: '1'
    }
}

