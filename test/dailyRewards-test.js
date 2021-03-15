const { expect } = require('chai');
const chai = require('chai');
chai.use(require('chai-string'));

describe('DailyRewards', function() {
    it('test daily rewards', async function() {
        const accounts = await ethers.getSigners();
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const bbsToken = await BBSToken.deploy(1000000);
        const DailyRewards = await ethers.getContractFactory('DailyRewards');
        const dailyRewards = await DailyRewards.deploy(bbsToken.address);

        console.info('trying to set rewards without declaration');
        try {
            await dailyRewards.setRewards();
            // This is obviously not the way to do this, but except throw doesn't seem to work here.
            expect(true, 'set rewards with no declaration').to.equal(false);
        } catch (exception) {
            expect(exception.toString()).to.endsWith('revert no rewards declared');
        }

        plannedRewards = [[accounts[1].address, accounts[2].address, accounts[3].address], [123, 234, 345]];

        await bbsToken.transfer(dailyRewards.address, 500000);

        console.info('declare rewards');
        events = await dailyRewards.queryFilter('RewardsDeclared', (
            await dailyRewards.declareRewards(...plannedRewards)).blockHash);

        console.info('verify decleration event');
        expect(events.length).to.equal(1);
        expect(events[0].eventSignature).to.equal('RewardsDeclared()');

        console.info('verify decleration var');
        for(rewardIndex = 0; rewardIndex < plannedRewards[0].length; rewardIndex++) {
            declaredReward = await dailyRewards.declaredRewards(rewardIndex);
            expect(declaredReward[0]).to.equal(plannedRewards[0][rewardIndex]);
            expect(declaredReward[1].toNumber()).to.equal(plannedRewards[1][rewardIndex]);
        }

        console.info('trying to set rewards without waiting after declaration');
        try {
            await dailyRewards.setRewards();
            // This is obviously not the way to do this, but except throw doesn't seem to work here.
            expect(true, 'set rewards with no declaration').to.equal(false);
        } catch (exception) {
            expect(exception.toString()).to.endsWith('revert rewards declared too recently');
        }

        console.info('moving time to set rewards');
        await network.provider.send('evm_increaseTime', [(await dailyRewards.DECLARATION_INTERVAL()).toNumber()]);

        console.info('set rewards');
        events = await dailyRewards.queryFilter('RewardsSet', (
            await dailyRewards.setRewards()).blockHash);

        console.info('verify set event');
        expect(events.length).to.equal(1);
        expect(events[0].eventSignature).to.equal('RewardsSet()');

        console.info('verify set var');
        for(rewardIndex = 0; rewardIndex < plannedRewards[0].length; rewardIndex++) {
            reward = await dailyRewards.rewards(rewardIndex);
            expect(reward[0]).to.equal(plannedRewards[0][rewardIndex]);
            expect(reward[1].toNumber()).to.equal(plannedRewards[1][rewardIndex]);
        }

        console.info('distributing rewards');
        blockHash = (await dailyRewards.distributeRewards()).blockHash;

        console.info('verify general distribute event');
        events = await dailyRewards.queryFilter('RewardsDistributed', blockHash);
        expect(events.length).to.equal(1);
        expect(events[0].eventSignature).to.equal('RewardsDistributed()');

        console.info('verify specific distribute events');
        events = await dailyRewards.queryFilter('RewardDistributed', blockHash);
        expect(events.length).to.equal(plannedRewards[0].length);
        for(rewardIndex = 0; rewardIndex < plannedRewards[0].length; rewardIndex++) {
            expect(events[rewardIndex].eventSignature).to.equal('RewardDistributed(address,uint256)');
            expect(events[rewardIndex].args.beneficiary).to.equal(plannedRewards[0][rewardIndex]);
            expect(events[rewardIndex].args.amountBBS.toNumber()).to.equal(plannedRewards[1][rewardIndex]);
        }

        console.info('trying to distribute rewards before distribution interval passed');
        try {
            await dailyRewards.distributeRewards();
            // This is obviously not the way to do this, but except throw doesn't seem to work here.
            expect(true, 'distributed rewards too often').to.equal(false);
        } catch (exception) {
            expect(exception.toString()).to.endsWith('revert rewards distributed too recently');
        }

        const account1Balance = await bbsToken.balanceOf(accounts[1].address);
        expect(account1Balance.toNumber()).to.equal(123);
        const account2Balance = await bbsToken.balanceOf(accounts[2].address);
        expect(account2Balance.toNumber()).to.equal(234);
        const account3Balance = await bbsToken.balanceOf(accounts[3].address);
        expect(account3Balance.toNumber()).to.equal(345);

        console.info('moving time to distribute rewards');
        await network.provider.send('evm_increaseTime', [(await dailyRewards.DISTRIBUTION_INTERVAL()).toNumber()]);
    });
});
