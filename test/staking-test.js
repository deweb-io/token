const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

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

    async function stake(endQuarter){
        await (await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, endQuarter);
        await increaseTime(0.5);
        await (await approveAndDoAs(stakers[1], stakeAmount)).lock(stakeAmount, endQuarter);
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

        await expectRevert.unspecified((await approveAndDoAs(owner, rewardAmount)).declareReward(0, rewardAmount));
        await (await approveAndDoAs(owner, rewardAmount)).declareReward(1, rewardAmount);
        await expectRevert.unspecified(staking.promoteQuarter());
        await network.provider.send('evm_increaseTime', [quarterLength]);
        await staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(2);

        await network.provider.send('evm_increaseTime', [quarterLength]);
        await expectRevert.unspecified(staking.promoteQuarter());
        await (await approveAndDoAs(owner, rewardAmount)).declareReward(2, rewardAmount);
        await staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(3);

        await stake(5);
        await increaseTime(1);
        expect(await staking.currentQuarter()).to.equal(4);

        // These should fail because quarter was not promoted. We really must stop using unspecified.
        await network.provider.send('evm_increaseTime', [quarterLength]);
        await expectRevert.unspecified((await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 13));
        await expectRevert.unspecified(staking.connect(stakers[0]).claim(0));
        await expectRevert.unspecified(staking.connect(stakers[0]).restake(0));
        await expectRevert.unspecified(staking.connect(stakers[0]).extend(0, 10));

    });

    it('stake creation', async() => {
        await expectRevert.unspecified(staking.lock(stakeAmount, 1));
        await expectRevert.unspecified((await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 0));
        await expectRevert.unspecified((await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 14));

        await stake(13);
        expect(await staking.getNumOfStakes(stakers[0].address)).to.equal(1);
        expect((await staking.getShare(stakers[0].address, 0, 13))).to.equal(0);
        expect((await staking.getShare(stakers[0].address, 0, 12))).to.equal(stakeAmount * 100);
        expect((await staking.getShare(stakers[0].address, 0, 11))).to.equal(stakeAmount * 125);
        expect(
            (await staking.getShare(stakers[0].address, 0, 0)) / (await staking.getShare(stakers[1].address, 0, 0))
        ).to.be.within(1.99, 2.01);
    });

    it('stake claiming', async() => {
        await stake(13);
        await increaseTime(1);
        expect((await bbsToken.balanceOf(stakers[0].address))).to.equal(0);
        expect((await bbsToken.balanceOf(stakers[1].address))).to.equal(0);

        let balance0, balance1;
        await staking.connect(stakers[0]).claim(0);
        await staking.connect(stakers[1]).claim(0);
        await expectRevert.unspecified(staking.connect(stakers[0]).claim(0));
        await expectRevert.unspecified(staking.connect(stakers[1]).claim(0));
        balance0 = (await bbsToken.balanceOf(stakers[0].address)).toNumber();
        balance1 = (await bbsToken.balanceOf(stakers[1].address)).toNumber();
        expect(balance0 / balance1).to.be.within(1.99, 2.01);

        await increaseTime(12);
        expect(await staking.currentQuarter()).to.equal(13);
        await staking.connect(stakers[0]).claim(0);
        await staking.connect(stakers[1]).claim(0);
        balance0 = (await bbsToken.balanceOf(stakers[0].address)).toNumber();
        balance1 = (await bbsToken.balanceOf(stakers[1].address)).toNumber();
        expect((2 * stakeAmount) + (13 * rewardAmount) - balance0 - balance1).to.be.below(2);
    });

    it('stake extension', async() => {
        await stake(2);
        const firstQuarterShare = await staking.getShare(stakers[1].address, 0, 0);
        expect((await staking.getShare(stakers[1].address, 0, 1))).to.equal(stakeAmount * 100);
        expect((await staking.getShare(stakers[1].address, 0, 2))).to.equal(0);

        await expectRevert.unspecified(staking.connect(stakers[1]).extend(1, 3));
        await staking.connect(stakers[1]).extend(0, 3);
        expect(await staking.getShare(stakers[1].address, 0, 0) / firstQuarterShare).to.be.within(1.19, 1.21);
        expect((await staking.getShare(stakers[1].address, 0, 1))).to.equal(stakeAmount * 125);
        expect((await staking.getShare(stakers[1].address, 0, 2))).to.equal(stakeAmount * 100);
        expect((await staking.getShare(stakers[1].address, 0, 3))).to.equal(0);
    });

    it('stake restaking', async() => {
        await stake(3);
        await increaseTime(1);
        await staking.connect(stakers[0]).claim(0);
        await increaseTime(1);
        expect((await staking.stakes(stakers[0].address, 0)).amount).to.equal(stakeAmount);
        await staking.connect(stakers[0]).restake(0);
        expect((await staking.stakes(stakers[0].address, 0)).amount).to.equal(stakeAmount + (0.5 * rewardAmount));
        await expectRevert.unspecified(staking.connect(stakers[0]).restake(0));
    });

    it('contract upgrade', async() => {
        await stake(2);
        await increaseTime(1);
        const stakingUpgrade = await ethers.getContractFactory('StakingUpgrade');
        staking = await upgrades.upgradeProxy(staking.address, stakingUpgrade);

        expect(await staking.currentQuarter()).to.equal(1);
        expect((await staking.getShare(stakers[0].address, 0, 2))).to.equal(0);
        expect((await staking.getShare(stakers[0].address, 0, 1))).to.equal(stakeAmount * 100);

        await expectRevert.unspecified(staking.connect(stakers[0]).extend(0, 2));
        await stake(3);
        expect((await staking.getShare(stakers[0].address, 1, 2))).to.equal(stakeAmount * 200);
    });
});
