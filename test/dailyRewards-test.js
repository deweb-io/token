const {expect} = require('chai');
const {expectRevert} = require('./utils');

describe('DailyRewards', () => {
    let accounts, bbsToken, dailyRewards, plannedRewards, invalidRewards, events;
    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const DailyRewards = await ethers.getContractFactory('DailyRewards');
        bbsToken = await BBSToken.deploy();
        dailyRewards = await DailyRewards.deploy(bbsToken.address);
        accounts = await ethers.getSigners();
        plannedRewards = [[accounts[1].address, accounts[2].address, accounts[3].address], [123, 234, 345]];
        invalidRewards = [[accounts[1].address, accounts[2].address, accounts[3].address], [123, 234]];
    });

    it('setting rewards', async() => {
        await expectRevert(dailyRewards.setRewards(), 'no rewards declared');
        await expectRevert(
            dailyRewards.declareRewards(...invalidRewards), 'missing amounts to set for all beneficiaries');
        await expectRevert(
            dailyRewards.connect(accounts[1]).declareRewards(...plannedRewards), 'caller is not the owner');
        events = await dailyRewards.queryFilter('RewardsDeclared', (
            await dailyRewards.declareRewards(...plannedRewards)).blockHash);
        expect(events.length).to.equal(1);
        expect(events[0].eventSignature).to.equal('RewardsDeclared()');
        for(let rewardIndex = 0; rewardIndex < plannedRewards[0].length; rewardIndex++) {
            const declaredReward = await dailyRewards.declaredRewards(rewardIndex);
            expect(declaredReward[0]).to.equal(plannedRewards[0][rewardIndex]);
            expect(declaredReward[1].toNumber()).to.equal(plannedRewards[1][rewardIndex]);
        }

        await expectRevert(dailyRewards.setRewards(), 'rewards declared too recently');
        await network.provider.send('evm_increaseTime', [(await dailyRewards.DECLARATION_INTERVAL()).toNumber()]);
        events = await dailyRewards.queryFilter('RewardsSet', (
            await dailyRewards.setRewards()).blockHash);
        expect(events.length).to.equal(1);
        expect(events[0].eventSignature).to.equal('RewardsSet()');
        for(let rewardIndex = 0; rewardIndex < plannedRewards[0].length; rewardIndex++) {
            let reward = await dailyRewards.rewards(rewardIndex);
            expect(reward[0]).to.equal(plannedRewards[0][rewardIndex]);
            expect(reward[1].toNumber()).to.equal(plannedRewards[1][rewardIndex]);
        }


    });

    it('distributing rewards', async() => {
        await bbsToken.mint(accounts[0].address, 1000000);
        await bbsToken.transfer(dailyRewards.address, 500000);
        await dailyRewards.declareRewards(...plannedRewards);
        await network.provider.send('evm_increaseTime', [(await dailyRewards.DECLARATION_INTERVAL()).toNumber()]);
        await dailyRewards.setRewards();

        const blockHash = (await dailyRewards.distributeRewards()).blockHash;
        events = await dailyRewards.queryFilter('RewardsDistributed', blockHash);
        expect(events.length).to.equal(1);
        expect(events[0].eventSignature).to.equal('RewardsDistributed()');

        events = await dailyRewards.queryFilter('RewardDistributed', blockHash);
        expect(events.length).to.equal(plannedRewards[0].length);
        for(let rewardIndex = 0; rewardIndex < plannedRewards[0].length; rewardIndex++) {
            expect(events[rewardIndex].eventSignature).to.equal('RewardDistributed(address,uint256)');
            expect(events[rewardIndex].args.beneficiary).to.equal(plannedRewards[0][rewardIndex]);
            expect(events[rewardIndex].args.amountBBS.toNumber()).to.equal(plannedRewards[1][rewardIndex]);
            expect((await bbsToken.balanceOf(plannedRewards[0][rewardIndex])).toNumber()).to.equal(
                plannedRewards[1][rewardIndex]);
        }

        await expectRevert(dailyRewards.distributeRewards(), 'rewards distributed too recently');
        await network.provider.send('evm_increaseTime', [(await dailyRewards.DISTRIBUTION_INTERVAL()).toNumber()]);
        await dailyRewards.distributeRewards();
    });
});
