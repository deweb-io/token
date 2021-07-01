const {expect} = require('chai');
const {range} = require('./utils');

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
        const nextQuarterStart = (await staking.nextQuarterStart()).toNumber();
        const currentTime = ethers.BigNumber.from(
            (await network.provider.send('eth_getBlockByNumber', ['latest', false])).timestamp).toNumber();
        const realQuarter = stakingQuarter + (1 - ((nextQuarterStart - currentTime) / quarterLength));
        return {
            realQuarter: realQuarter,
            currentTime: currentTime,
            nextQuarterStart: nextQuarterStart,
            stakingQuarter: stakingQuarter
        };
    }

    async function increaseTimeTo(quarterIdx){
        let {realQuarter, currentTime, nextQuarterStart} = await getTime();

        if(realQuarter > quarterIdx) throw(`can not increase time from ${realQuarter} to ${quarterIdx}`);

        await network.provider.send('evm_increaseTime', [(quarterIdx - realQuarter) * quarterLength]);
        await network.provider.send('evm_mine');
        currentTime = (await getTime()).currentTime;
        while(currentTime >= nextQuarterStart){
            await staking.promoteQuarter();
            nextQuarterStart = await staking.nextQuarterStart();
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

    async function lock(staker, amount, unlockQuarter){
        await (await approveAndDoAs(staker, amount)).lock(amount, unlockQuarter);
        console.log(`locked ${amount} tokens until ${unlockQuarter} for ${staker.address.slice(0, 5)}`);
    }

    async function extend(staker, stakeIdx, unlockQuarter, assertSharesEqual){
        await staking.connect(staker).extend(stakeIdx, unlockQuarter);
        const shares = (await staking.shares(staker.address, stakeIdx, await staking.currentQuarter())).toNumber();
        if(typeof(assertSharesEqual) === typeof(1)) expect(shares).to.equal(assertSharesEqual);
        console.log(`extended ${staker.address.slice(0, 5)}/${stakeIdx} until ${unlockQuarter}, current shares are ${shares}`);
    }

    async function lockRewards(staker, stakeIdx, assertStakeIncreaseEquals){
        const startingAmount = (await staking.stakes(staker.address, stakeIdx)).amount;
        await staking.connect(staker).lockRewards(stakeIdx);
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
        return claimAmount;
    }

    async function runScenario(steps){
        const functions = {
            declareReward: async(step) => await declareReward(step.quarterIdx, step.amount),
            lock: async(step) => await lock(step.staker, step.amount, step.unlockQuarter),
            increaseTimeTo: async(step) => await increaseTimeTo(step.quarterIdx),
            extend: async(step) => await extend(step.staker, step.stakeIdx, step.unlockQuarter, step.assertSharesEqual),
            lockRewards: async(step) => await lockRewards(step.staker, step.stakeIdx, step.assertStakeIncreaseEquals),
            claim: async(step) => await claim(step.staker, step.stakeIdx, step.assertClaimEquals)
        };
        const names = {
            alice: stakers[0],
            bob: stakers[1],
            carol: stakers[2],
            tal: stakers[3]
        };
        for(const [stepIdx, step] of steps.entries()){
            console.log(`running step ${stepIdx} - ${step.action}`);
            if(!(step.action in functions)) throw(`unknown action ${step.action}`);
            if('staker' in step) step.staker = names[step.staker];
            await functions[step.action](step);
        }
    }

    it('end-to-end-tests-1 [ @skipOnCoverage ]', async() => {
        await runScenario([
            {action: 'declareReward', quarterIdx: 0, amount: 10**9},
            {action: 'declareReward', quarterIdx: 1, amount: 10**9},
            {action: 'declareReward', quarterIdx: 2, amount: 10**9},
            {action: 'declareReward', quarterIdx: 3, amount: 10**9},
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
        ]);
    });

    it('end-to-end-tests-2 [ @skipOnCoverage ]', async() => {
        await runScenario([
            {action: 'declareReward', quarterIdx: 0, amount: 10**9},
            {action: 'declareReward', quarterIdx: 1, amount: 10**9},
            {action: 'declareReward', quarterIdx: 2, amount: 10**9},
            {action: 'declareReward', quarterIdx: 3, amount: 10**9},
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
    });

    it('load testing [ @skipOnCoverage ]', async function(){ // Do not use arrow notation or you won't have "this".
        const iterations = parseInt(process.env.LOAD_TEST_ITERATIONS, 10) || 5;
        if(iterations < 1000) console.warn(`running with only ${iterations} iterations`);
        this.timeout(5000 + (iterations * 1000));

        // Create/remove stakers as needed.
        while(stakers.length < iterations) stakers.push(new ethers.Wallet(stakers.length, owner.provider));
        stakers = stakers.slice(0, iterations);

        // Declare rewards.
        const rewardAmount = 10**9;
        let totalRewards = 0;
        for(const quarterIdx of range(13)){
            await declareReward(quarterIdx, rewardAmount);
            totalRewards += rewardAmount;
        }

        // Lock stakes.
        const stakeAmount = 10**6;
        let totalStakes = 0;
        for(const [index, staker] of stakers.entries()){
            owner.sendTransaction({to: staker.address, value: ethers.utils.parseEther('0.1')});
            console.log(`locking (${index + 1}/${iterations})`);
            await lock(staker, stakeAmount, 13 - (index % 13));
            totalStakes += stakeAmount;
        }

        // Promote time.
        await increaseTimeTo(13);

        // Claim stakes and rewards.
        let totalClaims = 0;
        for(const [index, staker] of stakers.entries()){
            owner.sendTransaction({to: staker.address, value: ethers.utils.parseEther('0.1')});
            console.log(`claiming (${index + 1}/${iterations})`);
            totalClaims += await claim(staker, 0);
        }

        expect(totalStakes + totalRewards - totalClaims).to.be.within(0, (iterations - 1) * 13);
    });
});
