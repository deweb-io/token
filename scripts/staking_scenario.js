const common = require('./common/common');
const {
    range, 
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
        {action: 'claim', staker: 'alice', stakeIdx: 0},
        {action: 'claim', staker: 'bob', stakeIdx: 0},
        {action: 'claim', staker: 'carol', stakeIdx: 0},
        {action: 'claim', staker: 'tal', stakeIdx: 0},
        {action: 'increaseTimeTo', quarterIdx: 2},
        {action: 'claim', staker: 'alice', stakeIdx: 0, assertClaimEquals: 250000000},
        {action: 'lockRewards', staker: 'bob', stakeIdx: 0, assertStakeIncreaseEquals: 250000000},
        {action: 'extend', staker: 'carol', stakeIdx: 0, unlockQuarter: 5, assertSharesEqual: 10**6 * 150},
        {action: 'increaseTimeTo', quarterIdx: 3},
        // Alice shares in Q2 = 100 * (10**6) = 100,000,000
        // Bob shares in Q2 = 100 * (10**6 + 250000000) = 25100000000
        // Carol shares in Q2 = 150 * (10**6)
        // Tal shares in Q2 = 100 * (10**6) = 100,000,000
        // Total shares Q2 = 25450000000
        // Q2 share price = 10**9 / 25450000000 = 0.0392927308447937 (BBS per share)
        {action: 'claim', staker: 'alice', stakeIdx: 0, assertClaimEquals: 4929273}, // Q2 rewards + initial stake
        {action: 'claim', staker: 'bob', stakeIdx: 0, assertClaimEquals: 1237247544}, // Q2 Rewards + Q1 Rewards + initial stake
        {action: 'claim', staker: 'carol', stakeIdx: 0, assertClaimEquals: 255893909} // Q2 Rewards + Q1 Rewards
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