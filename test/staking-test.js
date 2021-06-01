const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Staking', () => {
    let owner, stakers, bbsToken, staking, quarterLength;

    async function approveAndDoAs(signer, amount){
        await bbsToken.mint(signer.address, amount);
        await bbsToken.connect(signer).approve(staking.address, amount);
        return staking.connect(signer);
    }

    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const Staking = await ethers.getContractFactory('Staking');
        bbsToken = await BBSToken.deploy();
        staking = await Staking.deploy(bbsToken.address);
        [owner, ...stakers] = await ethers.getSigners();
        quarterLength = (await staking.QUARTER_LENGTH()).toNumber();
    });

    async function increaseTime(quarters) {
        await network.provider.send('evm_increaseTime', [(quarters || 1) * quarterLength]);
    }

    it('quarter promotion', async() => {
        expect(await staking.currentQuarter()).to.equal(0);
        staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(0);
        await increaseTime();
        staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(1);
    });

    it('stake creation', async() => {
        const stakeSize = 10**6;
        await expectRevert.unspecified(staking.lock(stakeSize, 1));

        await (await approveAndDoAs(stakers[0], stakeSize)).lock(stakeSize, 13);
        expect((await staking.getShare(stakers[0].address, 0, 13)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[0].address, 0, 12)).toNumber()).to.equal(stakeSize * 100);
        expect((await staking.getShare(stakers[0].address, 0, 11)).toNumber()).to.equal(stakeSize * 125);
        expect((stakeSize * 400) - (await staking.getShare(stakers[0].address, 0, 0)).toNumber()).to.be.below(500);

        await increaseTime(0.5);
        await (await approveAndDoAs(stakers[1], stakeSize)).lock(stakeSize, 13);
        expect((await staking.getShare(stakers[1].address, 0, 13)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[1].address, 0, 12)).toNumber()).to.equal(stakeSize * 100);
        expect((await staking.getShare(stakers[1].address, 0, 11)).toNumber()).to.equal(stakeSize * 125);
        expect((stakeSize * 400 / 2) - (await staking.getShare(stakers[0].address, 0, 0)).toNumber()).to.be.below(500);

        const rewardSize = 10**6;
        await (await approveAndDoAs(owner, rewardSize)).declareReward(0, rewardSize);
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
        expect(claim0 + claim1 - stakeSize - stakeSize - rewardSize).to.be.below(2);
        const reward0 = claim0 - stakeSize;
        const reward1 = claim1 - stakeSize;
        expect(reward0 - reward1 - reward1).to.be.below(2);
    });

    it('stake extension', async() => {
        const stakeSize = 10**6;
        await (await approveAndDoAs(stakers[0], stakeSize)).lock(stakeSize, 2);
        expect((await staking.getShare(stakers[0].address, 0, 2)).toNumber()).to.equal(0);
        expect((await staking.getShare(stakers[0].address, 0, 1)).toNumber()).to.equal(stakeSize * 100);
        await expectRevert.unspecified(staking.connect(stakers[0]).extend(0, 2));
        await staking.connect(stakers[0]).extend(0, 3);
        expect((await staking.getShare(stakers[0].address, 0, 2)).toNumber()).to.equal(stakeSize * 100);
        expect((await staking.getShare(stakers[0].address, 0, 1)).toNumber()).to.equal(stakeSize * 125);
    });
});
