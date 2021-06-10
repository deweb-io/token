const {expect} = require('chai');

describe('end to end tests', () => {
    let owner, stakers, bbsToken, staking, quarterLength;

    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const Staking = await ethers.getContractFactory('Staking');
        bbsToken = await BBSToken.deploy();
        staking = await upgrades.deployProxy(Staking, [bbsToken.address]);
        [owner, ...stakers] = await ethers.getSigners();
        quarterLength = (await staking.QUARTER_LENGTH()).toNumber();
    });

    async function getTime(){
        await network.provider.send('evm_mine');
        const stakingQuarter = await staking.currentQuarter();
        const quarterEnd = (await staking.currentQuarterEnd()).toNumber();
        const currentTime = ethers.BigNumber.from(
            (await network.provider.send('eth_getBlockByNumber', ['latest', false])).timestamp).toNumber();
        const realQuarter = stakingQuarter + (1 - ((quarterEnd - currentTime) / quarterLength));
        return {
            realQuarter: realQuarter,
            currentTime: currentTime,
            quarterEnd: quarterEnd,
            stakingQuarter: stakingQuarter
        };
    }

    async function increaseTimeTo(quarterIdx){
        let {realQuarter, currentTime, quarterEnd} = await getTime();

        if(realQuarter > quarterIdx) throw(`can not increase time from ${realQuarter} to ${quarterIdx}`);

        await network.provider.send('evm_increaseTime', [(quarterIdx - realQuarter) * quarterLength]);
        await network.provider.send('evm_mine');
        currentTime = (await getTime()).currentTime;
        while(currentTime >= quarterEnd){
            await staking.promoteQuarter();
            quarterEnd = await staking.currentQuarterEnd();
        }

        realQuarter = (await getTime()).realQuarter;
        console.log(`current quarter it is now ${realQuarter} (${quarterIdx} requested)`);
    }

    async function approveAndDoAs(signer, amount){
        await bbsToken.mint(signer.address, amount);
        await bbsToken.connect(signer).approve(staking.address, amount);
        return staking.connect(signer);
    }

    async function declareReward(quarterIdx, rewardAmount){
        await (await approveAndDoAs(owner, rewardAmount)).declareReward(quarterIdx, rewardAmount);
        console.log(`reward of ${rewardAmount} was declared for quarter ${quarterIdx}`);
    }

    async function lock(staker, amount, endQuarter){
        await (await approveAndDoAs(staker, amount)).lock(amount, endQuarter);
        console.log(`locked ${amount} tokens until ${endQuarter} for ${staker.address.slice(0, 5)}`);
    }

    async function extend(staker, stakeIdx, endQuarter, assertSharesEqual){
        await staking.connect(staker).extend(stakeIdx, endQuarter);
        const shares = (await staking.shares(staker.address, stakeIdx, await staking.currentQuarter())).toNumber();
        if(typeof(assertSharesEqual) === typeof(1)) expect(shares).to.equal(assertSharesEqual);
        console.log(`extended ${staker.address.slice(0, 5)}/${stakeIdx} until ${endQuarter}, current shares are ${shares}`);
    }

    async function restake(staker, stakeIdx, assertStakeIncreaseEquals){
        const startingAmount = (await staking.stakes(staker.address, stakeIdx)).amount;
        await staking.connect(staker).restake(stakeIdx);
        const stakeChange = (await staking.stakes(staker.address, stakeIdx)).amount - startingAmount;
        if(typeof(assertStakeIncreaseEquals) === typeof(1)) expect(stakeChange).to.equal(assertStakeIncreaseEquals);
        console.log(`restaked ${staker.address.slice(0, 5)}/${stakeIdx} for an added ${stakeChange}`);
    }

    async function getBalance(staker){
        return (await bbsToken.balanceOf(staker.address)).toNumber();
    }

    async function claim(staker, stakeIdx, assertClaimEquals){
        const startingBalance = await getBalance(staker);
        await staking.connect(staker).claim(stakeIdx);
        const claimAmount = (await getBalance(staker)) - startingBalance;
        if(typeof(assertClaimEquals) === typeof(1)) expect(claimAmount).to.equal(assertClaimEquals);
        console.log(`claimed ${staker.address.slice(0, 5)}/${stakeIdx} and got ${claimAmount}`);
    }

    async function runScenario(steps){
        const functions = {
            declareReward: async(step) => await declareReward(step.quarterIdx, step.amount),
            lock: async(step) => await lock(step.staker, step.amount, step.endQuarter),
            increaseTimeTo: async(step) => await increaseTimeTo(step.quarterIdx),
            extend: async(step) => await extend(step.staker, step.stakeIdx, step.endQuarter, step.assertSharesEqual),
            restake: async(step) => await restake(step.staker, step.stakeIdx, step.assertStakeIncreaseEquals),
            claim: async(step) => await claim(step.staker, step.stakeIdx, step.assertClaimEquals)
        };
        const names = {
            alice: stakers[0],
            bob: stakers[1],
            carol: stakers[2]
        };
        for(const [stepIdx, step] of steps.entries()){
            console.log(`running step ${stepIdx} - ${step.action}`);
            if(!(step.action in functions)) throw(`unknown action ${step.action}`);
            if('staker' in step) step.staker = names[step.staker];
            await functions[step.action](step);
        }
    }

    it('end-to-end-tests-1', async() => {
        await runScenario([
            {action: 'declareReward', quarterIdx: 0, amount: 10**9},
            {action: 'declareReward', quarterIdx: 1, amount: 10**9},
            {action: 'declareReward', quarterIdx: 2, amount: 10**9},
            {action: 'declareReward', quarterIdx: 3, amount: 10**9},
            {action: 'lock', staker: 'alice', amount: 10**6, endQuarter: 3},
            {action: 'lock', staker: 'bob', amount: 10**6, endQuarter: 3},
            {action: 'lock', staker: 'carol', amount: 10**6, endQuarter: 3},
            {action: 'increaseTimeTo', quarterIdx: 1},
            {action: 'claim', staker: 'alice', stakeIdx: 0},
            {action: 'claim', staker: 'bob', stakeIdx: 0},
            {action: 'claim', staker: 'carol', stakeIdx: 0},
            {action: 'increaseTimeTo', quarterIdx: 2},
            {action: 'claim', staker: 'alice', stakeIdx: 0, assertClaimEquals: 333333333},
            {action: 'restake', staker: 'bob', stakeIdx: 0, assertStakeIncreaseEquals: 333333333},
            {action: 'extend', staker: 'carol', stakeIdx: 0, endQuarter: 5, assertSharesEqual: 10**6 * 150},
            {action: 'increaseTimeTo', quarterIdx: 3},
            {action: 'claim', staker: 'alice', stakeIdx: 0, assertClaimEquals: 3968827},
            {action: 'claim', staker: 'bob', stakeIdx: 0, assertClaimEquals: 1326911264},
            {action: 'claim', staker: 'carol', stakeIdx: 0, assertClaimEquals: 337786574},
        ]);
    });
});
