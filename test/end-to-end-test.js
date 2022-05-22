const {expect} = require('chai');
const {range} = require('./utils');
const {s1, s2, s4} = require('./scenarios');

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
        await runScenario(s1);
    });

    it('end to end 2 [ @skipOnCoverage ]', async() => {
        await runScenario(s2);
    });

    it('end to end 3 [ @skipOnCoverage ]', async() => {
        await runScenario(s4);
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
