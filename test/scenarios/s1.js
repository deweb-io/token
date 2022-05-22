const {range} = require('../utils');

module.exports = [
    {action: 'declareReward', quartersIdx: range(4), amount: 10**9},
    {action: 'lock', staker: 'alice', amount: 10**6, unlockQuarter: 3},
    {action: 'lock', staker: 'bob', amount: 10**6, unlockQuarter: 3},
    {action: 'lock', staker: 'carol', amount: 10**6, unlockQuarter: 3},
    {action: 'increaseTimeTo', quarterIdx: 1},
    {action: 'claim', staker: 'alice', stakeIdx: 0},
    {action: 'claim', staker: 'bob', stakeIdx: 0},
    {action: 'claim', staker: 'carol', stakeIdx: 0},
    {action: 'increaseTimeTo', quarterIdx: 2},
    {action: 'claim', staker: 'alice', stakeIdx: 0, assertClaimEquals: 333333333},
    {action: 'lockRewards', staker: 'bob', stakeIdx: 0, assertStakeIncreaseEquals: 333333333},
    {action: 'extend', staker: 'carol', stakeIdx: 0, unlockQuarter: 5, assertSharesEqual: 10**6 * 150},
    {action: 'increaseTimeTo', quarterIdx: 3},
    // Alice shares in Q2 = ׂ100 * 10**6 shares = 100,000,000
    // Bob shares in Q2 = 100 * (10**6 (Inital stack) + 333,333,333 (Q1 rewards)) shares = 3,3433,333,300
    // Carol shares in Q2 = 150 * 10**6 shares = 150,000,000
    // Total shares in Q2 = 3,3683,333,300
    // Share price in Q2 = 10**9 (Q2 rewards) / 3,3683,333,300 = 0.02968827316 (BBS per share)
    // Alice reward in Q2 = 100,000,000 * 0.02968827316 = 2,968,827
    // Alice claim in Q3 = 2,968,827 + 10**6 = 3,968,827
    // Bob claim in Q3 = 10**6 + (333,333,333, Q1 rewards) + (3,3433,333,300 * 0.02968827316, Q2 rewards) = 1,326,911,264
    // Carol reward and claim in Q3 = (333,333,333, Q1 rewards) + (150,000,000 * 0.02968827316, Q2 rewards) = 337,786,574
    {action: 'claim', staker: 'alice', stakeIdx: 0, assertClaimEquals: 3968827},
    {action: 'claim', staker: 'bob', stakeIdx: 0, assertClaimEquals: 1326911264},
    {action: 'claim', staker: 'carol', stakeIdx: 0, assertClaimEquals: 337786574},
];