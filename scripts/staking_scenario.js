const common = require('./common/common');
const {range} = require('../test/utils');
const {
    initStaking,
    runScenario,
    getBBSTokenAddress,
    getStakingContractAddress} = require('../test/staking-utils');
const { network } = require('hardhat');


async function main() {
    await initStaking();

    await runScenario([
        {action: 'declareReward', quartersIdx: range(4), amount: 10**9},
        {action: 'lock', staker: 'alice', amount: 10**6, unlockQuarter: 3},
        {action: 'lock', staker: 'bob', amount: 10**6, unlockQuarter: 3},
        {action: 'lock', staker: 'carol', amount: 10**6, unlockQuarter: 3},
        {action: 'lock', staker: 'tal', amount: 10**6, unlockQuarter: 3},
        {action: 'increaseTimeTo', quarterIdx: 1},
        // Alice shares in Q0 = 150 * (10**6) = 150,000,000
        // Bob shares in Q0 = 150 * (10**6) = 150,000,000
        // Carol shares in Q0 = 150 * (10**6) = 150,000,000
        // Tal shares in Q0 = 150 * (10**6) = 150,000,000
        // Total shares Q0 = 150 * 4 * (10**6) = 600,000,000
        // Q0 share price = (10**9) / 600,000,000 = 1.66666666667 (BBS per share)
        // Alice rewards in Q0 = 150,000,000(shares in Q0) * 1.66666666667(price in Q0) = ~250,000,000(the first locked quarter is never a complete quarter)
        // Bob rewards in Q0 = ~250,000,000
        // Carol rewards in Q0 = ~250,000,000
        // Tal rewards in Q0 = ~250,000,000
        // Alice claim in Q0 = 0
        // Bob claim in Q0 = 0
        // Carol claim in Q0 = 0
        // Tal claim in Q0 = 0
        // total claimed before Q1 = 0
        // total rewerds before Q1 = 4 * (10**9) - 0(claimed rewards) = 4,000,000,000
        {action: 'claim', staker: 'alice', stakeIdx: 0},
        {action: 'claim', staker: 'bob', stakeIdx: 0},
        {action: 'claim', staker: 'carol', stakeIdx: 0},
        {action: 'claim', staker: 'tal', stakeIdx: 0},
        {action: 'increaseTimeTo', quarterIdx: 2},
        // Alice shares in Q1 = 125,000,000
        // Bob shares in Q1 = 125,000,000
        // Carol shares in Q1 = 125,000,000
        // Tal shares in Q1 = 125,000,000
        // Total shares Q1 = 500,000,000
        // Q1 share price = (10**9) / 500,000,000 = 2 (BBS per share)
        // Alice rewards in Q1 = 125,000,000(shares in Q1) * 2(price in Q1) = 250,000,000
        // Bob rewards in Q1 = 250,000,000
        // Carol rewards in Q1 = 250,000,000
        // Tal rewards in Q1 = 250,000,000
        // Alice claim in Q1 = 250,000,000
        // Bob claim in Q1 = 250,000,000
        // Carol claim in Q1 = 250,000,000
        // Tal claim in Q1 = 250,000,000
        // total claimed before Q2 = ~1,000,000,000
        // total rewerds before Q2 = 4,000,000,000 - ~1,000,000,000 = ~3,000,000,000
        {action: 'claim', staker: 'alice', stakeIdx: 0},
        {action: 'lockRewards', staker: 'bob', stakeIdx: 0},
        {action: 'extend', staker: 'carol', stakeIdx: 0, unlockQuarter: 5},
        {action: 'increaseTimeTo', quarterIdx: 3},
        // Alice shares in Q2 = 100 * (10**6) = 100,000,000
        // Bob shares in Q2 = 100 * (10**6 + 250,000,000) = 25,100,000,000
        // Carol shares in Q2 = 150 * (10**6) = 150,000,000
        // Tal shares in Q2 = 100 * (10**6) = 100,000,000
        // Total shares Q2 = 25,450,000,000
        // Q2 share price = 10**9 / 25,450,000,000 = 0.0392927308447937 (BBS per share)
        // Alice rewards in Q2 = 100,000,000(shares in Q2) * 0.0392927308447937(price in Q2) = 3,929,273
        // Bob rewards in Q2 = 25,100,000,000 * 0.0392927308447937 = 986,247,544
        // Carol rewards in Q2 = 5,893,909
        // Tal rewards in Q2 = 3,929,273
        // Alice claim in Q2 = 250,000,000
        // Bob claim in Q2 = 250,000,000
        // total claimed before Q3 = ~1,000,000,000 + 500,000,000(alice+bob) = 1,500,000,000
        // total rewerds before Q3 = 4,000,000,000 - ~1,500,000,000 = ~2,500,000,000
        {action: 'claim', staker: 'alice', stakeIdx: 0}, // Q2 rewards + initial stake
        {action: 'claim', staker: 'bob', stakeIdx: 0}, // Q2 Rewards + Q1 Rewards + initial stake
        {action: 'claim', staker: 'carol', stakeIdx: 0} // Q2 Rewards + Q1 Rewards
        // Alice rewards in Q2 = 100,000,000(shares in Q2) * 0.0392927308447937(price in Q2) = 3,929,273
        // Bob rewards in Q2 = 25,100,000,000 * 0.0392927308447937 = 986,247,544
        // Carol rewards in Q2 = 5,893,909
        // Tal rewards in Q2 = 3,929,273
        // Alice claim in Q3 = 3,929,273
        // Bob claim in Q3 = 986,247,544
        // carol claim in Q3 = 5,893,909(from Q2) + 250,000,000(from Q1) = 255,893,909
        // total claimed before Q4 = ~1,500,000,000 + 1,246,070,726 = 2,746,070,726
        // total rewerds before Q4 = 4,000,000,000 - 2,746,070,726 = 1,253,929,274
    ]);

    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');
    await network.provider.send('evm_mine');

    // print contracts addresses
    console.log('staking address', getStakingContractAddress());
    console.log('BBS token address', getBBSTokenAddress());
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
