const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Staking', () => {
    const stakeAmount = 10**6;
    const rewardAmount = 10**6;
    let owner, stakers, bbsToken, staking, quarterLength;

    async function approveAndDoAs(signer, amount){
        await bbsToken.mint(signer.address, amount);
        await bbsToken.connect(signer).approve(staking.address, amount);
        return staking.connect(signer);
    }

    async function increaseTime(quarters) {
        quarters = quarters || 1;
        await network.provider.send('evm_increaseTime', [quarters * quarterLength]);
        while(quarters > 0){
            await staking.promoteQuarter();
            quarters = quarters - 1;
        }
    }

    async function stake(){
        await (await approveAndDoAs(owner, rewardAmount)).declareReward(0, rewardAmount);
        await (await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 13);
        await (await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 2);
        await increaseTime(0.5);
        await (await approveAndDoAs(stakers[1], stakeAmount)).lock(stakeAmount, 13);
        await (await approveAndDoAs(stakers[1], stakeAmount)).lock(stakeAmount, 2);
    }

    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const Staking = await ethers.getContractFactory('Staking');
        bbsToken = await BBSToken.deploy();
        staking = await Staking.deploy(bbsToken.address);
        [owner, ...stakers] = await ethers.getSigners();
        quarterLength = (await staking.QUARTER_LENGTH()).toNumber();
    });

    it('quarter promotion', async() => {
        expect(await staking.currentQuarter()).to.equal(0);
        await staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(0);
        await increaseTime();
        await staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(1);
        await expectRevert.unspecified((await approveAndDoAs(owner, rewardAmount)).declareReward(0, rewardAmount));
    });

    it('stake creation', async() => {
        await stake();
        await expectRevert.unspecified(staking.lock(stakeAmount, 1));
        await expectRevert.unspecified((await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 0));
        await expectRevert.unspecified((await approveAndDoAs(stakers[0], stakeAmount)).lock(stakeAmount, 14));

        expect((await staking.getShare(stakers[0].address, 0, 13)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[0].address, 0, 12)).toNumber()).to.equal(stakeAmount * 100);
        expect((await staking.getShare(stakers[0].address, 0, 11)).toNumber()).to.equal(stakeAmount * 125);
        expect((stakeAmount * 400) - (await staking.getShare(stakers[0].address, 0, 0)).toNumber()).to.be.below(500);

        expect((await staking.getShare(stakers[1].address, 0, 13)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[1].address, 0, 12)).toNumber()).to.equal(stakeAmount * 100);
        expect((await staking.getShare(stakers[1].address, 0, 11)).toNumber()).to.equal(stakeAmount * 125);
        expect((stakeAmount * 400 / 2) - (await staking.getShare(stakers[0].address, 0, 0)).toNumber()).to.be.below(500);
    });

    it('stake claiming', async() => {
        await stake();
        await increaseTime(13);
        let startingQuarter = await staking.currentQuarter()
        for(let quarterIdx = startingQuarter; quarterIdx - startingQuarter < 13; quarterIdx++){
            await staking.promoteQuarter();
        }
        expect(await staking.currentQuarter()).to.equal(13);

        expect((await bbsToken.balanceOf(stakers[0].address)).toNumber()).to.equal(0);
        expect((await bbsToken.balanceOf(stakers[1].address)).toNumber()).to.equal(0);
        await staking.connect(stakers[0]).claim(0);
        await staking.connect(stakers[1]).claim(0);
        const claim0 = (await bbsToken.balanceOf(stakers[0].address)).toNumber();
        const claim1 = (await bbsToken.balanceOf(stakers[1].address)).toNumber();
        expect(claim0 + claim1 - stakeAmount - stakeAmount - rewardAmount).to.be.below(2);
        const reward0 = claim0 - stakeAmount;
        const reward1 = claim1 - stakeAmount;
        expect(reward0 - reward1 - reward1).to.be.below(5);

        await expectRevert.unspecified(staking.connect(stakers[0]).claim(0));
    });

    it('stake extension', async() => {
        await stake();
        expect((await staking.getShare(stakers[0].address, 1, 2)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[0].address, 1, 1)).toNumber()).to.equal(stakeAmount * 100);
        expect(stakeAmount * 125 - (await staking.getShare(stakers[0].address, 1, 0)).toNumber()).to.be.below(500);
        expect((await staking.getShare(stakers[1].address, 1, 2)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[1].address, 1, 1)).toNumber()).to.equal(stakeAmount * 100);
        expect(stakeAmount * 125 / 2 - (await staking.getShare(stakers[1].address, 1, 0)).toNumber()).to.be.below(500);

        await expectRevert.unspecified(staking.connect(stakers[0]).extend(1, 2));
        await staking.connect(stakers[0]).extend(1, 3);
        await staking.connect(stakers[1]).extend(1, 3);
        expect((await staking.getShare(stakers[0].address, 1, 3)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[0].address, 1, 2)).toNumber()).to.equal(stakeAmount * 100);
        expect((await staking.getShare(stakers[0].address, 1, 1)).toNumber()).to.equal(stakeAmount * 125);
        expect(stakeAmount * 150 - (await staking.getShare(stakers[0].address, 1, 0)).toNumber()).to.be.below(500);
        expect((await staking.getShare(stakers[0].address, 1, 3)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[0].address, 1, 2)).toNumber()).to.equal(stakeAmount * 100);
        expect((await staking.getShare(stakers[0].address, 1, 1)).toNumber()).to.equal(stakeAmount * 125);
        expect(stakeAmount * 150 - (await staking.getShare(stakers[0].address, 1, 0)).toNumber()).to.be.below(500);
    });

    it('stake restaking', async() => {
        await stake();
        await increaseTime(10);
        await staking.connect(stakers[0]).claim(0);
        await (await approveAndDoAs(owner, rewardAmount)).declareReward(11, rewardAmount);
        await increaseTime(2);
        expect((await staking.stakes(stakers[0].address, 0)).amount.toNumber()).to.equal(stakeAmount);
        await staking.connect(stakers[0]).restake(0);
        expect((await staking.stakes(stakers[0].address, 0)).amount.toNumber()).to.equal(stakeAmount * 1.5);

        await expectRevert.unspecified(staking.connect(stakers[0]).restake(0));
    });
});
