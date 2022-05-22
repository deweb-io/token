const {range} = require('../utils');

module.exports = [
    // Staking:Q0, SubStaking:Null
    {action: 'declareReward', quartersIdx: range(4), amount: 10**9},
    {action: 'lock', staker: 'alice', amount: 10**6, unlockQuarter: 3},
    {action: 'lock', staker: 'bob', amount: 10**6, unlockQuarter: 3},
    {action: 'lock', staker: 'carol', amount: 10**6, unlockQuarter: 3},
    {action: 'increaseTimeTo', quarterIdx: 0.5},
    {action: 'deploySub'},
    // Staking:Q0, SubStaking:Q0
    {action: 'lockSub', staker: 'binanceStaker1', amount: (10**6) / 2, unlockQuarter: 3},
    {action: 'lockSub', staker: 'binanceStaker2', amount: (10**6) / 2, unlockQuarter: 3},
    {action: 'withdraw', staker: 'manager', amount: 10**6},
    {action: 'lock', staker: 'manager', amount: 10**6, unlockQuarter: 3},
    {action: 'increaseTimeTo', quarterIdx: 1},
    // Staking:Q1, SubStaking:Q0
    {action: 'claim', staker: 'alice', stakeIdx: 0},
    {action: 'claim', staker: 'manager', stakeIdx: 0}, // claim rewards from Staking:Q0
    {action: 'claim', staker: 'bob', stakeIdx: 0},
    {action: 'claim', staker: 'carol', stakeIdx: 0},
    {action: 'decalreRewardSub', quarterId: 0}, // declare rewards to SubStaking:Q0
    {action: 'increaseTimeTo', quarterIdx: 2},
    // Staking:Q2, SubStaking:Q1
    {action: 'claimSub', 'staker': 'binanceStaker1', stakeIdx: 0}, // claim for cleanup
    {action: 'claimSub', 'staker': 'binanceStaker2', stakeIdx: 0}, // claim for cleanup
    {action: 'claim', staker: 'alice', stakeIdx: 0, assertClaimEquals: 250000000},
    {action: 'lockRewards', staker: 'bob', stakeIdx: 0, assertStakeIncreaseEquals: 250000000},
    {action: 'extend', staker: 'carol', stakeIdx: 0, unlockQuarter: 5, assertSharesEqual: 10**6 * 150},
    {action: 'claim', staker: 'manager', stakeIdx: 0, assertClaimEquals: 250000000}, // claim rewards from Staking:Q1
    {action: 'decalreRewardSub', quarterId: 1}, // declare rewards to SubStaking:Q1
    {action: 'increaseTimeTo', quarterIdx: 3}, // Staking:Q3, SubStaking:Q2
    // Alice shares in Q2 = 100 * (10**6) = 100,000,000
    // Manager shares in Q2 = 100 * (10**6) = 100,000,000
    // Bob shares in Q2 = 100 * (10**6 + 250000000) = 25100000000
    // Carol shares in Q2 = 150 * (10**6)
    // Total shares Q2 = 25450000000
    // Q2 share price = 10**9 / 25450000000 = 0.0392927308447937 (BBS per share)
    {action: 'claim', staker: 'alice', stakeIdx: 0, assertClaimEquals: 4929273}, // Q2 rewards + initial stake
    {action: 'claim', staker: 'bob', stakeIdx: 0, assertClaimEquals: 1237247544}, // Q2 Rewards + Q1 Rewards + initial stake
    {action: 'claim', staker: 'carol', stakeIdx: 0, assertClaimEquals: 255893909}, // Q2 Rewards + Q1 Rewards
    {action: 'claim', staker: 'manager', stakeIdx: 0, assertClaimEquals: 3929273 + 10**6}, // Q2 Rewards + initial stake

    // In this stage we are in the middle of Substaking Q2 (rewards decalred only for Q0 and Q1, and rewards can be claimed up to Q1 including)
    {action: 'deposit', staker: 'manager', 'amount': 10**6 }, // deposit back the original stake amount before Q2 ends on SubStaking
    {action: 'decalreRewardSub', quarterId: 2}, // declare rewards to SubStaking:Q2
    {action: 'increaseTimeTo', quarterIdx: 4}, // Staking:Q4, SubStaking:Q3
    {action: 'claimSub', 'staker': 'binanceStaker1', stakeIdx: 0, assertClaimEquals: 127464636}, // 127464636 = 0.5 * (10**6 (original amount) + 3929273(Q2 reward) + 250000000(Q1 reward))
    {action: 'claimSub', 'staker': 'binanceStaker2', stakeIdx: 0, assertClaimEquals: 127464636}
];