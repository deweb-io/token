const {execSync} = require('child_process');
const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');
const {signPermit} = require('../scripts/utils/utils');
const fs = require('fs');
const hardhat = require('hardhat');
const path = require('path');

describe('SubStaking', () => {
    const stakeAmount = 10**6;
    const rewardAmount = 10**9;
    const deadline = 9999999999;
    const QUARTER_PROMOTED_EVENT = 'QuarterPromoted';
    const STAKE_LOCKED_EVENT = 'StakeLocked';
    const REWARD_DECLARED_EVENT = 'RewardDeclared';
    const REWARD_CLAIMED_EVENT = 'RewardsClaimed';
    let owner, stakers, bbsToken, staking, quarterLength, tokenName;

    async function mintAndDoAs(signer, amount){
        await bbsToken.mint(signer.address, amount);
        return staking.connect(signer);
    }

    async function signPermitData(signer, value) {
        return await signPermit(signer, staking.address, value, deadline, bbsToken, tokenName);
    }

    async function increaseTime(quarters){
        if (isNaN(quarters) == true)
            throw new Error('increaseTime failed: quarters parameter is not a valid number');

        await network.provider.send('evm_increaseTime', [quarters * quarterLength]);
        await network.provider.send('evm_mine');
        const currentTime = ethers.BigNumber.from(((await network.provider.send(
            'eth_getBlockByNumber', ['latest', false])).timestamp));
        for(
            let nextQuarterStart = await staking.nextQuarterStart();
            currentTime >= nextQuarterStart;
            nextQuarterStart = await staking.nextQuarterStart()
        ){
            const currentQuarter = await staking.currentQuarter();
            await bbsToken.approve(staking.address, rewardAmount);
            await (await mintAndDoAs(owner, rewardAmount))['declareReward(uint16,uint256)'](currentQuarter, rewardAmount);
            await expect(await staking.promoteQuarter()).to.emit(staking, QUARTER_PROMOTED_EVENT, currentQuarter+1);
        }
    }

    async function stake(endQuarter){
        let signature = await signPermitData(stakers[0], stakeAmount);
        await expect((await mintAndDoAs(stakers[0], stakeAmount))['lock(uint256,uint16,uint256,uint8,bytes32,bytes32)'](
            stakeAmount, endQuarter, deadline, signature.v, signature.r, signature.s
        )).to.emit(staking, STAKE_LOCKED_EVENT);

        await increaseTime(0.5);

        signature = await signPermitData(stakers[1], stakeAmount);
        await expect((await mintAndDoAs(stakers[1], stakeAmount))['lock(uint256,uint16,uint256,uint8,bytes32,bytes32)'](
            stakeAmount, endQuarter, deadline, signature.v, signature.r, signature.s
        )).to.emit(staking, STAKE_LOCKED_EVENT);
    }

    async function getBalance(stakerId) {
        return (await bbsToken.balanceOf(stakers[stakerId].address)).toNumber();
    }

    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const Staking = await ethers.getContractFactory('SubStaking');
        bbsToken = await BBSToken.deploy();

        const currentTime = ethers.BigNumber.from(
            (await network.provider.send('eth_getBlockByNumber', ['latest', false])).timestamp);
        const expectedQuarterLength = ethers.BigNumber.from(60*60*24*91); //expected length is 91 days
        const nextQuarterStart = currentTime.add(expectedQuarterLength);
        staking = await upgrades.deployProxy(Staking, [bbsToken.address, 0, nextQuarterStart]);

        tokenName = await bbsToken.name();
        quarterLength = (await staking.QUARTER_LENGTH()).toNumber();
        //verify that quarter length is as expected before
        if (quarterLength != expectedQuarterLength.toNumber())
            throw new Error('quarter length is not unique');
        [owner, ...stakers] = await ethers.getSigners();
    });

    it('quarter promotion', async() => {
        expect(await staking.currentQuarter()).to.equal(0);
        await increaseTime(1);
        expect(await staking.currentQuarter()).to.equal(1);

        let signature = await signPermitData(owner, rewardAmount);
        await expectRevert(
            (await mintAndDoAs(owner, rewardAmount))['declareReward(uint16,uint256,uint256,uint8,bytes32,bytes32)'](
                0, rewardAmount, deadline, signature.v, signature.r, signature.s),
            'can not declare rewards for past quarters');
        await expect((await mintAndDoAs(owner, rewardAmount))['declareReward(uint16,uint256,uint256,uint8,bytes32,bytes32)'](
            1, rewardAmount, deadline, signature.v, signature.r, signature.s
        )).to.emit(staking, REWARD_DECLARED_EVENT).withArgs(1, rewardAmount, rewardAmount);
        await expectRevert(staking.promoteQuarter(), 'current quarter is not yet over');
        await network.provider.send('evm_increaseTime', [quarterLength]);
        await expect(await staking.promoteQuarter()).to.emit(staking, QUARTER_PROMOTED_EVENT).withArgs(2);
        expect(await staking.currentQuarter()).to.equal(2);

        await network.provider.send('evm_increaseTime', [quarterLength]);
        await expectRevert(staking.promoteQuarter(), 'current quarter has no reward');
        signature = await signPermitData(owner, rewardAmount);
        await expect((await mintAndDoAs(owner, rewardAmount))['declareReward(uint16,uint256,uint256,uint8,bytes32,bytes32)'](
            2, rewardAmount, deadline, signature.v, signature.r, signature.s
        )).to.emit(staking, REWARD_DECLARED_EVENT).withArgs(2, rewardAmount, rewardAmount);
        await expect(await staking.promoteQuarter()).to.emit(staking, QUARTER_PROMOTED_EVENT).withArgs(3);
        expect(await staking.currentQuarter()).to.equal(3);

        await stake(5);
        await increaseTime(1);
        expect(await staking.currentQuarter()).to.equal(4);

        // These should fail because quarter was not promoted. We really must stop using unspecified.
        await network.provider.send('evm_increaseTime', [quarterLength]);
        const {v, r, s} = await signPermitData(stakers[0], stakeAmount);
        await expectRevert(
            (await mintAndDoAs(stakers[0], stakeAmount))['lock(uint256,uint16,uint256,uint8,bytes32,bytes32)'](stakeAmount, 13, deadline, v, r, s), 'quarter must be promoted');
        await expectRevert(staking.connect(stakers[0]).claim(0), 'quarter must be promoted');
        await expectRevert(staking.connect(stakers[0]).extend(0, 10), 'quarter must be promoted');
    });

    it('stake creation', async() => {
        const { v, r, s} = await signPermitData(stakers[0], stakeAmount);
        await expectRevert(
            staking['lock(uint256,uint16,uint256,uint8,bytes32,bytes32)'](stakeAmount, 1, deadline, v, r, s),
            'ERC20Permit: invalid signature');
        await expectRevert(
            (await mintAndDoAs(stakers[0], stakeAmount))['lock(uint256,uint16,uint256,uint8,bytes32,bytes32)'](stakeAmount, 0, deadline, v, r, s),
            'can not lock for less than one quarter');
        await expectRevert(
            (await mintAndDoAs(stakers[0], stakeAmount))['lock(uint256,uint16,uint256,uint8,bytes32,bytes32)'](stakeAmount, 14, deadline, v, r, s),
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
        await expect (await staking.connect(stakers[0]).claim(0)).to.emit(staking, REWARD_CLAIMED_EVENT);
        await staking.connect(stakers[1]).claim(0);
        await expectRevert(staking.connect(stakers[0]).claim(0), 'nothing to claim');
        await expectRevert(staking.connect(stakers[1]).claim(0), 'nothing to claim');
        balance0 = (await getBalance(0));
        balance1 = (await getBalance(1));
        expect(balance0 / balance1).to.be.within(1.99, 2.01);

        await increaseTime(12);
        expect(await staking.currentQuarter()).to.equal(13);
        await expect (await staking.connect(stakers[0]).claim(0)).to.emit(staking, REWARD_CLAIMED_EVENT);
        await expect (await staking.connect(stakers[1]).claim(0)).to.emit(staking, REWARD_CLAIMED_EVENT);
        balance0 = (await getBalance(0));
        balance1 = (await getBalance(1));
        expect((2 * stakeAmount) + (13 * rewardAmount) - balance0 - balance1).to.be.below(2);
    });

    it('stake extension', async() => {
        await stake(2);
        const firstQuarterShare = await staking.shares(stakers[1].address, 0, 0);
        expectBigNum((await staking.shares(stakers[1].address, 0, 1))).to.equal(stakeAmount * 100);
        expectBigNum((await staking.shares(stakers[1].address, 0, 2))).to.equal(0);
        await expectRevert(staking.connect(stakers[1]).extend(0, 2), 'must extend beyond current lock');
        await expect(await staking.connect(stakers[1]).extend(0, 3)).to.emit(staking, STAKE_LOCKED_EVENT);
        expect(await staking.shares(stakers[1].address, 0, 0) / firstQuarterShare).to.be.within(1.19, 1.21);
        expectBigNum((await staking.shares(stakers[1].address, 0, 1))).to.equal(stakeAmount * 125);
        expectBigNum((await staking.shares(stakers[1].address, 0, 2))).to.equal(stakeAmount * 100);
        expectBigNum((await staking.shares(stakers[1].address, 0, 3))).to.equal(0);
    });

    it('multiple stakes for account', async() => {
        await stake(4);
        await stake(4);

        expectBigNum((await staking.shares(stakers[0].address, 0, 2))).to.equal(stakeAmount * 125);
        expectBigNum((await staking.shares(stakers[0].address, 1, 2))).to.equal(stakeAmount * 125);
        expectBigNum(await staking.getNumOfStakes(stakers[0].address)).to.equal(2);
        expectBigNum(await staking.getTotalShares(stakers[0].address, 2)).to.equal(2 * stakeAmount * 125);

        const maxShareQ0 = stakeAmount * 175;
        expectBigNum((await staking.shares(stakers[0].address, 0, 0))).to.be.within(
            maxShareQ0 - 1000, maxShareQ0);
        expectBigNum((await staking.shares(stakers[0].address, 1, 0))).to.be.within(
            (maxShareQ0 / 2 - 1000), maxShareQ0 / 2);
    });

    it('voting power', async() => {
        await stake(4);
        await stake(4);

        const nextQuarter = 1 + (await staking.currentQuarter());
        const sharesForNextQuarter = await staking.getTotalShares(stakers[0].address, nextQuarter);
        expectBigNum(await staking.getVotingPower(stakers[0].address)).to.equal(sharesForNextQuarter.toNumber());
    });

    // This test can affect the line counters for the coverage report, so keep it at the end.
    it('contract upgrade', async() => {
        await stake(2);
        await increaseTime(1);

        // Create and deploy upgrade contract.
        const originalContract = path.join(hardhat.config.paths.sources, 'SubStaking.sol');
        const upgradeContract = path.join(hardhat.config.paths.sources, 'SubStakingUpgrade.sol');
        fs.writeFileSync(upgradeContract, fs.readFileSync(originalContract, 'utf-8')
            .replace('contract SubStaking is', 'contract SubStakingUpgrade is')
            .replace('quarterIdx - 1) * 25)', 'quarterIdx - 1) * 50)'));
        execSync('npx hardhat compile 2> /dev/null');
        fs.unlinkSync(upgradeContract);
        staking = await upgrades.upgradeProxy(staking.address, await ethers.getContractFactory('SubStakingUpgrade'));

        expect(await staking.currentQuarter()).to.equal(1);
        expectBigNum((await staking.shares(stakers[0].address, 0, 2))).to.equal(0);
        expectBigNum((await staking.shares(stakers[0].address, 0, 1))).to.equal(stakeAmount * 100);

        await expectRevert(staking.connect(stakers[0]).extend(0, 2), 'must extend beyond current lock');
        await stake(4);
        expectBigNum((await staking.shares(stakers[0].address, 1, 3))).to.equal(stakeAmount * 100);
        expectBigNum((await staking.shares(stakers[0].address, 1, 2))).to.equal(stakeAmount * 150);
    });

    it('withdraw', async() => {
        expect(await bbsToken.balanceOf(owner.address)).to.equal(0);
        expect(await bbsToken.balanceOf(staking.address)).to.equal(0);

        await stake(13);
        expect(await bbsToken.balanceOf(staking.address)).to.above(0);

        await expectRevert(
            staking.connect(stakers[1]).withdraw(stakeAmount), 'Ownable: caller is not the owner');

        await staking.withdraw(stakeAmount);
        expect(await bbsToken.balanceOf(owner.address)).to.equal(stakeAmount);
    });
});