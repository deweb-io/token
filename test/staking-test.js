const {execSync} = require('child_process');
const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');
const fs = require('fs');
const hardhat = require('hardhat');
const path = require('path');

describe('Staking', () => {
    const stakeAmount = 10**6;
    const rewardAmount = 10**9;
    let owner, stakers, bbsToken, staking, quarterLength;

    async function approveAndDoAs(signer, amount){
        await bbsToken.mint(signer.address, amount);
        await bbsToken.connect(signer).approve(staking.address, amount);
        return staking.connect(signer);
    }

    async function increaseTime(quarters){
        if (isNaN(quarters) == true)
            throw new Error('increaseTime failed: quarters parameter is not a valid number');

        await network.provider.send('evm_increaseTime', [quarters * quarterLength]);
        await network.provider.send('evm_mine');
        const currentTime = ethers.BigNumber.from(((await network.provider.send(
            'eth_getBlockByNumber', ['latest', false])).timestamp));
        for(
            let currentQuarterEnd = await staking.currentQuarterEnd();
            currentTime >= currentQuarterEnd;
            currentQuarterEnd = await staking.currentQuarterEnd()
        ){
            const currentQuarter = await staking.currentQuarter();
            await (await approveAndDoAs(owner, rewardAmount)).declareReward(currentQuarter, rewardAmount);
            await staking.promoteQuarter();
        }
    }

    async function stake(endQuarter){
        await (await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, endQuarter);
        await increaseTime(0.5);
        await (await approveAndDoAs(stakers[1], stakeAmount)).lock(stakeAmount, endQuarter);
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

    it('quarter promotion', async() => {
        expect(await staking.currentQuarter()).to.equal(0);
        await increaseTime(1);
        expect(await staking.currentQuarter()).to.equal(1);

        await expectRevert(
            (await approveAndDoAs(owner, rewardAmount)).declareReward(0, rewardAmount),
            'can not declare rewards for past quarters');
        await (await approveAndDoAs(owner, rewardAmount)).declareReward(1, rewardAmount);
        await expectRevert(staking.promoteQuarter(), 'currnet quarter is not yet over');
        await network.provider.send('evm_increaseTime', [quarterLength]);
        await staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(2);

        await network.provider.send('evm_increaseTime', [quarterLength]);
        await expectRevert(staking.promoteQuarter(), 'currnet quarter has no reward');
        await (await approveAndDoAs(owner, rewardAmount)).declareReward(2, rewardAmount);
        await staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(3);

        await stake(5);
        await increaseTime(1);
        expect(await staking.currentQuarter()).to.equal(4);

        // These should fail because quarter was not promoted. We really must stop using unspecified.
        await network.provider.send('evm_increaseTime', [quarterLength]);
        await expectRevert(
            (await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 13), 'quarter must be promoted');
        await expectRevert(staking.connect(stakers[0]).claim(0), 'quarter must be promoted');
        await expectRevert(staking.connect(stakers[0]).restake(0), 'quarter must be promoted');
        await expectRevert(staking.connect(stakers[0]).extend(0, 10), 'quarter must be promoted');

    });

    it('stake creation', async() => {
        await expectRevert(staking.lock(stakeAmount, 1), 'transfer amount exceeds balance');
        await expectRevert(
            (await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 0),
            'can not lock for less than one quarter');
        await expectRevert(
            (await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 14),
            'can not lock for more than 13 quarters');

        await stake(13);
        expectBigNum(await staking.getNumOfStakes(stakers[0].address)).to.equal(1);
        expectBigNum((await staking.shares(stakers[0].address, 0, 13))).to.equal(0);
        expectBigNum((await staking.shares(stakers[0].address, 0, 12))).to.equal(stakeAmount * 100);
        expectBigNum((await staking.shares(stakers[0].address, 0, 11))).to.equal(stakeAmount * 125);
        expect(
            (await staking.shares(stakers[0].address, 0, 0)) / (await staking.shares(stakers[1].address, 0, 0))
        ).to.be.within(1.99, 2.01);
    });

    it('stake claiming', async() => {
        await stake(13);
        await increaseTime(1);
        expect(await getBalance(0)).to.equal(0);
        expect(await getBalance(1)).to.equal(0);

        let balance0, balance1;
        await staking.connect(stakers[0]).claim(0);
        await staking.connect(stakers[1]).claim(0);
        await expectRevert(staking.connect(stakers[0]).claim(0), 'nothing to claim');
        await expectRevert(staking.connect(stakers[1]).claim(0), 'nothing to claim');
        balance0 = (await getBalance(0));
        balance1 = (await getBalance(1));
        expect(balance0 / balance1).to.be.within(1.99, 2.01);

        await increaseTime(12);
        expect(await staking.currentQuarter()).to.equal(13);
        await staking.connect(stakers[0]).claim(0);
        await staking.connect(stakers[1]).claim(0);
        balance0 = (await getBalance(0));
        balance1 = (await getBalance(1));
        expect((2 * stakeAmount) + (13 * rewardAmount) - balance0 - balance1).to.be.below(2);
    });

    it('stake extension', async() => {
        await stake(2);
        const firstQuarterShare = await staking.shares(stakers[1].address, 0, 0);
        expectBigNum((await staking.shares(stakers[1].address, 0, 1))).to.equal(stakeAmount * 100);
        expectBigNum((await staking.shares(stakers[1].address, 0, 2))).to.equal(0);
        await expectRevert(staking.connect(stakers[1]).extend(0, 2), 'must extend beyond current end quarter');
        await staking.connect(stakers[1]).extend(0, 3);
        expect(await staking.shares(stakers[1].address, 0, 0) / firstQuarterShare).to.be.within(1.19, 1.21);
        expectBigNum((await staking.shares(stakers[1].address, 0, 1))).to.equal(stakeAmount * 125);
        expectBigNum((await staking.shares(stakers[1].address, 0, 2))).to.equal(stakeAmount * 100);
        expectBigNum((await staking.shares(stakers[1].address, 0, 3))).to.equal(0);
    });

    it('stake restaking', async() => {
        await stake(3);
        await increaseTime(1);
        await staking.connect(stakers[0]).claim(0);
        await increaseTime(1);
        expectBigNum((await staking.stakes(stakers[0].address, 0)).amount).to.equal(stakeAmount);
        await staking.connect(stakers[0]).restake(0);
        expectBigNum((await staking.stakes(stakers[0].address, 0)).amount).to.equal(stakeAmount + (0.5 * rewardAmount));
        await expectRevert(staking.connect(stakers[0]).restake(0), 'no rewards to restake');
    });

    it('contract upgrade', async() => {
        await stake(2);
        await increaseTime(1);

        // Create and deploy upgrade contract.
        const originalContract = path.join(hardhat.config.paths.sources, 'Staking.sol');
        const upgradeContract = path.join(hardhat.config.paths.sources, 'StakingUpgrade.sol');
        fs.writeFileSync(upgradeContract, fs.readFileSync(originalContract, 'utf-8')
            .replace('contract Staking is', 'contract StakingUpgrade is')
            .replace('quarterIdx - 1) * 25)', 'quarterIdx - 1) * 50)'));
        execSync('npx hardhat compile 2> /dev/null');
        fs.unlinkSync(upgradeContract);
        staking = await upgrades.upgradeProxy(staking.address, await ethers.getContractFactory('StakingUpgrade'));

        expect(await staking.currentQuarter()).to.equal(1);
        expectBigNum((await staking.shares(stakers[0].address, 0, 2))).to.equal(0);
        expectBigNum((await staking.shares(stakers[0].address, 0, 1))).to.equal(stakeAmount * 100);

        await expectRevert(staking.connect(stakers[0]).extend(0, 2), 'must extend beyond current end quarter');
        await stake(4);
        expectBigNum((await staking.shares(stakers[0].address, 1, 3))).to.equal(stakeAmount * 100);
        expectBigNum((await staking.shares(stakers[0].address, 1, 2))).to.equal(stakeAmount * 150);
    });

    it('multiple stakes for account', async() => {
        await stake(4);
        await stake(4);
        expectBigNum((await staking.shares(stakers[0].address, 0, 2))).to.equal(stakeAmount * 125);
        expectBigNum((await staking.shares(stakers[0].address, 1, 2))).to.equal(stakeAmount * 125);
        const maxShareQ0 = stakeAmount * 175;
        expectBigNum((await staking.shares(stakers[0].address, 0, 0))).to.be.within(
            maxShareQ0 - 1000, maxShareQ0);
        expectBigNum((await staking.shares(stakers[0].address, 1, 0))).to.be.within(
            (maxShareQ0 / 2 - 1000), maxShareQ0 / 2);
    });
});
