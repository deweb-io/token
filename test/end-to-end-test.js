const {execSync} = require('child_process');
const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');
const fs = require('fs');
const hardhat = require('hardhat');
const path = require('path');

SCENARIOS = [
    [
        {action: 'lock', actor: 1, amount: 100, endQuarter: 10},
        {action: 'declareReward', amount: 100, quarter: 0},
        {action: 'increaseTime', quarters: 1},
        {action: 'claim', actor: 1, stake: 0},
        {action: 'assertBalance', actor: 1, amount: 100}
    ]
]

describe('end to end tests', () => {
    const stakeAmount = 10**6;
    const rewardAmount = 10**9;
    let owner, stakers, bbsToken, staking, quarterLength;

    async function approveAndDoAs(signer, amount){
        await bbsToken.mint(signer.address, amount);
        await bbsToken.connect(signer).approve(staking.address, amount);
        return staking.connect(signer);
    }

    async function increaseTime(quarters){
        await network.provider.send('evm_increaseTime', [quarters * quarterLength]);
        await network.provider.send('evm_mine');
        let currentTime, currentQuarter, currentQuarterEnd;
        while(true){
            currentQuarterEnd = await staking.currentQuarterEnd();
            currentQuarter = await staking.currentQuarter()
            currentTime = ethers.BigNumber.from(((await network.provider.send(
                'eth_getBlockByNumber', ['latest', false])).timestamp));
            if(currentTime < currentQuarterEnd) break;
            await (await approveAndDoAs(owner, rewardAmount)).declareReward(currentQuarter, rewardAmount);
            await staking.promoteQuarter();
        }
    }

    async function runStep(step){
        if(step['action'] === ''){
        }else if(step['action'] === ''){
        }
    }

    /**
     * @dev Performs the stake by the given stakes details.
     * @param stakes Array with stakes details [[staker, stakeAmount, endQuarter, quartersToIncreaseBeforeLock],...]
     */
    async function stake(stakes){
        for (const stake of stakes) {
            if (stake[3] > 0)
                await increaseTime(stake[3]);
            await (await approveAndDoAs(stake[0], stake[1])).lock(stake[1], stake[2]);
        };
    }

    async function getBalance(stakerId) {
        return (await bbsToken.balanceOf(stakers[stakerId].address)).toNumber();
    }

    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const Staking = await ethers.getContractFactory('Staking');
        bbsToken = await BBSToken.deploy();
        staking = await upgrades.deployProxy(Staking, [bbsToken.address]);
        [owner, ...stakers] = await ethers.getSigners();
        quarterLength = (await staking.QUARTER_LENGTH()).toNumber();
    });

    it('end-to-end-tests-1', async() => {
        // Quarter 0
        await stake([
            [stakers[0], stakeAmount, 3, 0],
            [stakers[1], stakeAmount, 3, 0],
            [stakers[2], stakeAmount, 3, 0]]);
        await increaseTime(1);

        // Quarter 1
        /**
         * The following cleanup the rewards from the first quarter by:
         * 1. claime the reward.
         * 2. transfer the rewards (to have balance of 0).
         */
        for (const stakerId of [0, 1, 2]) {
            await staking.connect(stakers[stakerId]).claim(0);
            await (bbsToken.connect(stakers[stakerId]).transfer(owner.address, await getBalance(stakerId)));
            expect((await getBalance(stakerId))).to.equal(0);
        }
        await increaseTime(1);

        // Quarter 2
        expect(await staking.currentQuarter()).to.equal(2);
        await staking.connect(stakers[0]).claim(0);
        expect(await getBalance(0)).to.equal(Math.floor(rewardAmount / 3));

        await staking.connect(stakers[1]).restake(0);
        expectBigNum((await staking.stakes(stakers[1].address, 0)).amount).to.equal(
            stakeAmount + (Math.floor(rewardAmount / 3)));

        await staking.connect(stakers[2]).extend(0, 5);

        await increaseTime(1);

        // Quarter 3
        expect(await staking.currentQuarter()).to.equal(3);
        totalshares = (await (await staking.quarters(2)).shares).toNumber();
        staker0SharesQ2 = (await staking.getShare(stakers[0].address, 0, 2)).toNumber();
        staker1SharesQ2 = (await staking.getShare(stakers[1].address, 0, 2)).toNumber();
        staker2SharesQ2 = (await staking.getShare(stakers[2].address, 0, 2)).toNumber();

        for (const stakerId of [0, 1, 2])
            await staking.connect(stakers[stakerId]).claim(0);

        expect(await getBalance(0)).to.equal(stakeAmount + Math.floor(rewardAmount / 3) + Math.floor(rewardAmount * (staker0SharesQ2 / totalshares)));
        expect(await getBalance(1)).to.equal(stakeAmount + Math.floor(rewardAmount / 3) + Math.floor(rewardAmount * (staker1SharesQ2 / totalshares)));
        const balance2 = await getBalance(2);
        expect(balance2 - (Math.floor(rewardAmount / 3) + Math.floor(rewardAmount * (staker2SharesQ2 / totalshares)))).below(1.01);
    });
});
