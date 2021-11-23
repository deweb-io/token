const {expect} = require('chai');
const {range} = require('./utils');
const {
    initStaking,
    increaseTimeTo,
    declareReward,
    lock,
    extend,
    claim,
    getStakers,
    getOwner,
    runScenario} = require('./staking-utils');

describe('End to End', () => {
    const originalConsoleDebug = console.debug;

    before(() => {
        if(!process.env.TEST_DEBUG) console.debug = () => null;
    });

    after(() => {
        console.debug = originalConsoleDebug;
    });

    beforeEach(async() => {
        await initStaking();
    });


    it('end to end 1 [ @skipOnCoverage ]', async() => {
        await runScenario([
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
        ]);
    });

    it('end to end 2 [ @skipOnCoverage ]', async() => {
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
    });

    it('load testing [ @skipOnCoverage ]', async function(){ // Do not use arrow notation or you won't have "this".
        const iterations = parseInt(process.env.TEST_ITERATIONS, 10) || 3;
        if(iterations < 1000){
            console.warn(`NOTE: running load testing with only ${iterations} iterations (set TEST_ITERATIONS)`);
        }
        this.timeout(5000 + (iterations * 10000));
        let stakers = getStakers();
        let owner = getOwner();

        // Create/remove stakers as needed.
        while(stakers.length < iterations) stakers.push(new ethers.Wallet(stakers.length, owner.provider));
        stakers = stakers.slice(0, iterations);

        // Declare rewards.
        const rewardAmount = 10**9;
        const totalRewards = 14 * rewardAmount;
        await declareReward(range(14), rewardAmount);

        // Lock stakes.
        const stakeAmount = 10**6;
        let totalStakes = 0;
        for(const [index, staker] of stakers.entries()){
            owner.sendTransaction({to: staker.address, value: ethers.utils.parseEther('0.5')});
            console.debug(`locking (${index + 1}/${iterations})`);
            await lock(staker, stakeAmount, 13 - (index % 13));
            totalStakes += stakeAmount;
        }

        // Promote to quarter 1, extend locks, and claim all rewards on quarter 0 to clear partial quarters.
        await increaseTimeTo(1);
        let totalClaims = 0;
        for(const [index, staker] of stakers.entries()){
            console.debug(`extending and claiming rewards of quarter 0 (${index + 1}/${iterations})`);
            await extend(staker, 0, 14 - (index % 13));
            totalClaims += await claim(staker, 0);
        }

        // Go over each quarter, claiming and expecting.
        const iterationsQuotient = Math.floor(iterations / 13);
        const iterationsRemainder = 12 - (iterations % 13);
        for(let quarterShift in range(13)){
            // Why do I need to parseInt here, javascript?! Why???
            await increaseTimeTo(parseInt(quarterShift, 10) + 2);

            // Collect data, only asserting consistency.
            let sampleClaims = [];
            const claimIterations = iterations - (iterationsQuotient * quarterShift) - (
                quarterShift > iterationsRemainder ? quarterShift - iterationsRemainder - 1 : 0);
            let claimIndex = 0;
            for(const [index, staker] of stakers.entries()){
                if(index % 13 >= 13 - quarterShift) continue;
                console.debug(`claiming (${++claimIndex}/${claimIterations})`);
                let currentClaim = await claim(staker, 0);
                totalClaims += currentClaim;
                if(index % 13 === 12 - quarterShift) currentClaim -= stakeAmount;
                if(sampleClaims.length < 13 - quarterShift) sampleClaims.push(currentClaim);
                else expect(currentClaim).to.equal(sampleClaims[index % 13]);
            }

            // Verify that the boosts are correct.
            let baseClaim = sampleClaims.pop();
            for(const [index, sample] of Object.entries(sampleClaims)){
                const expectedRatio = 1 + (0.25 * (sampleClaims.length - index));
                expect(Math.abs(expectedRatio - (sample / baseClaim))).to.be.below(1);
            }
        }

        // Verify totals.
        expect(totalStakes + totalRewards - totalClaims).to.be.within(0, (iterations - 1) * 13);
    });
});
