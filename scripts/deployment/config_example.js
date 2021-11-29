/**
 * Copy this file to config.js before using.
 */
module.exports = {
    network: 'ropsten', // For etherscan verification
    mint: {
        totalSupply: '1000000000',
    },
    safe :  {
        address : '0xE01b6a22c3F1C486181A39442A1D4924730005c8'
    },
    rewards: [ { q : 0, amount: '100'}, { q : 1, amount: '200'}],
    bridge: {
        maxLockLimit : '40000000000000000000000',
        maxReleaseLimit: '80000000000000000000000',
        minLimit: '1000000000000000000',
        limitIncPerBlock: '500000000000000000000',
        minRequiredReports: 1,
        commissionAmount: '0',
        sendRewardsToAccount: 'a1234',
        sendRewardsMaxLockLimit: '1000000000000000000000000',
        reporters: {
            addresses: ['0x70997970c51812dc3a010c7d01b50e0d17dc79c8'],
            active: [true]
        }
    },
    dailyRewards: {
        //To avoid copying of rewardsSender address to config, we get it in the script directly
        amount: '1000'
    }
}

