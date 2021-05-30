const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Staking', () => {
    let accounts, bbsToken, staking;
    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const Staking = await ethers.getContractFactory('Staking');
        bbsToken = await BBSToken.deploy();
        staking = await Staking.deploy(bbsToken.address);
        accounts = await ethers.getSigners();
    });

    it('quarter promotion', async() => {
        expect(await staking.currentQuarter()).to.equal(0);
        staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(0);
        await network.provider.send('evm_increaseTime', [(await staking.QUARTER_LENGTH()).toNumber()]);
        staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(1);
    });

    it('stake creation', async() => {
        const stakeSize = 10**6;
        await expectRevert.unspecified(staking.lock(stakeSize, 1));
        await bbsToken.approve(staking.address, stakeSize);
        await expectRevert.unspecified(staking.lock(stakeSize, 1));
        await bbsToken.mint(accounts[0].address, stakeSize);
        await bbsToken.approve(staking.address, 0);
        await expectRevert.unspecified(staking.lock(stakeSize, 1));
        await bbsToken.approve(staking.address, stakeSize);
        await staking.lock(stakeSize, 13);
        expect((await staking.getShare(accounts[0].address, 0, 13)).toNumber()).to.equal(0);
        expect((await staking.getShare(accounts[0].address, 0, 12)).toNumber()).to.equal(stakeSize * 100);
        expect((await staking.getShare(accounts[0].address, 0, 11)).toNumber()).to.equal(stakeSize * 125);
        expect((stakeSize * 400) - (await staking.getShare(accounts[0].address, 0, 0)).toNumber()).to.be.below(500);

        await bbsToken.mint(accounts[0].address, stakeSize);
        await bbsToken.approve(staking.address, stakeSize);
        await network.provider.send('evm_increaseTime', [(await staking.QUARTER_LENGTH()).toNumber() / 2]);
        await staking.lock(stakeSize, 13);
        expect((await staking.getShare(accounts[0].address, 1, 13)).toNumber()).to.equal(0);
        expect((await staking.getShare(accounts[0].address, 1, 12)).toNumber()).to.equal(stakeSize * 100);
        expect((await staking.getShare(accounts[0].address, 1, 11)).toNumber()).to.equal(stakeSize * 125);
        expect((stakeSize * 400 / 2) - (await staking.getShare(accounts[0].address, 1, 0)).toNumber()).to.be.below(1000);

        const rewardSize = 10**6;
        await bbsToken.mint(accounts[0].address, rewardSize);
        await bbsToken.approve(staking.address, rewardSize);
        await staking.declareReward(0, rewardSize);

        await network.provider.send('evm_increaseTime', [(await staking.QUARTER_LENGTH()).toNumber()]);
        staking.promoteQuarter();
        expect(await staking.currentQuarter()).to.equal(1);
        await staking.claim(1);
    });
});
