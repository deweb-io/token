/**
 * Copy this file to config.js before using.
 */
module.exports = {
    network: 'rinkeby', // For etherscan verification
    mint: {
        totalSupply: '1000000000',
    },
    safe : {
        address : '0xE01b6a22c3F1C486181A39442A1D4924730005c8'
    },
    rewards: [ { q : 0, amount: '100000'}, { q : 1, amount: '100000'}],
    bridge: {
        maxLockLimit : '40000',
        maxReleaseLimit: '80000',
        minLimit: '1',
        limitIncPerBlock: '500',
        minRequiredReports: 1,
        commissionAmount: '0',
        sendRewards : {
            toBlockchain: 'eos',
            toAccount: 'a1234',
            maxLockLimit: '1000000'
        },
        reporters: {
            addresses: ['0x70997970c51812dc3a010c7d01b50e0d17dc79c8'],
            active: [true]
        },
    },
    dailyRewards: {
        //To avoid copying of rewardsSender address to config, we get it in the script directly
        amount: '1000'
    }
};

