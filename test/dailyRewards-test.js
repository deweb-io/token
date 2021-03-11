const { expect } = require('chai');

describe('DailyRewards', function() {
    it('test daily rewards', async function() {
        const accounts = await ethers.getSigners();
        const DailyRewards = await ethers.getContractFactory('DailyRewards');
        const dailyRewards = await DailyRewards.deploy();
        await dailyRewards.deployed();

        console.info('trying to set rewards without declaration');
        try {
            await dailyRewards.setRewards();
            // This is obviously not the way to do this, but except throw doesn't seem to work here.
            expect(true, 'set rewards with no declaration').to.equal(false);
        } catch (exception) {
            expect(exception.toString()).to.equal('Error: VM Exception while processing transaction: revert no rewards declared');
        }

        console.info('declare rewards');
        await dailyRewards.declareRewards([accounts[1].address], [123]);
        let declaredRewards = await dailyRewards.declaredRewards(0);
        expect(declaredRewards[0]).to.equal(accounts[1].address);
        expect(declaredRewards[1].toNumber()).to.equal(123);

        console.info('trying to set rewards without waiting after declaration');
        try {
            await dailyRewards.setRewards();
            // This is obviously not the way to do this, but except throw doesn't seem to work here.
            expect(true, 'set rewards with no declaration').to.equal(false);
        } catch (exception) {
            expect(exception.toString()).to.equal('Error: VM Exception while processing transaction: revert rewards declared too recently');
        }

        console.info('moving time to set rewards');
        await network.provider.send('evm_increaseTime', [(await dailyRewards.DECLARATION_INTERVAL()).toNumber()]);
        await dailyRewards.setRewards();
        let rewards = await dailyRewards.rewards(0);
        expect(rewards[0]).to.equal(accounts[1].address);
        expect(rewards[1].toNumber()).to.equal(123);
    });
});
