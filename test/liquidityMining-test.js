const { expect } = require('chai');
const chai = require('chai');
chai.use(require('chai-string'));

const BBS_INIT_BALANCE = 100;
const MAX_ACCOUNTS = 10;

describe('LiquidityMining', function() {
    let startTime;
    let accounts;
    let BBSToken;
    let bbsToken;
    let LiquidityMining;
    let liquidityMining;

    beforeEach(async function() {
        startTime = Math.floor(new Date / 1000);
        currentTime = startTime;
        accounts = (await ethers.getSigners()).slice(0, MAX_ACCOUNTS);
        BBSToken = await ethers.getContractFactory('BBSToken');
        bbsToken = await BBSToken.deploy();
        LiquidityMining = await ethers.getContractFactory('LiquidityMining');
        liquidityMining = await LiquidityMining.deploy(bbsToken.address);
        await Promise.all(accounts.map(async (account, index) => {
            await bbsToken.mint(BBS_INIT_BALANCE);
            if(index > 0) await bbsToken.transfer(account.address, BBS_INIT_BALANCE);
        }));
    });

    function getDaysTillTimestamp(timestamp, since) {
        //note : since is not a number - it is an object (bigNumber probably).
        if(!since) since = startTime;
        return Math.floor((timestamp - since) / 60 / 60 / 24) + ' days';
    }

    async function printBalance(accountIndex) {
        console.log(`account ${accountIndex} has ${await getBalance(accounts[accountIndex].address)} bbs`);
    }

    function printRewards(accountIndex, rewards) {
        console.log(`account ${accountIndex} receieved rewards: ${rewards}`);
    }
    async function getBalance(address) {
        return (await bbsToken.balanceOf(address)).toNumber(10);
    }

    async function sendBBSToLM(amount) {
        console.log(`Send ${amount} BBS to lm contract`);
        await bbsToken.mint(amount);
        await bbsToken.transfer(liquidityMining.address, amount)
    }

    async function increaseTime(numOfDays) {
        await network.provider.send('evm_increaseTime', [(numOfDays * 60 * 60 * 24 )]);
    }

    async function stats(){
        return (await Promise.all(accounts.map(async (account, index) => {
            let balance = (await bbsToken.balanceOf(account.address)).toNumber();
            let lockedAccount = await liquidityMining.lockedPositions(account.address);
            return 'account ' + index + ' has ' + balance + ' bbs' + (
                parseInt(lockedAccount.withdrawTimestamp, 10) === 0 ? '' : (
                    ' and ' + lockedAccount.numberOfShares.toNumber() +
                    ' shares from locking them until ' + getDaysTillTimestamp(lockedAccount.withdrawTimestamp, lockedAccount.lockTimestamp)
                )
            );
        }))).join("\n");
    }

    it('should fail on illegal lock periods', async function() {
        for(let period of [99, 1101]) {
            try {
                await liquidityMining.lockPosition(period);
            } catch(exception) {
                expect(exception.toString()).to.endsWith(' Illeagal lock period (Lock account for 100 - 1100 days)');
            }
        }
    });

    it('should create new locks', async function() {
        await Promise.all(accounts.map(async (account, index) => {
            await liquidityMining.connect(account).lockPosition(100 + Math.floor(1000 / accounts.length * (index + 1)));
        }));
        console.log(await stats());
    });

    it('should fail on unlocking time has not arrived yet', async function() {
        try {
            const numOfDays = 100;
            const bbsRewards = 1000;
            await liquidityMining.connect(accounts[0]).lockPosition(numOfDays);
            await sendBBSToLM(bbsRewards);
            await liquidityMining.unlockPosition(accounts[0].address)            
        } catch (exception){
            expect(exception.toString()).to.endsWith(' Unlocking time has not arrived yet');
        }
    });

    it('should fail on unlocking before locking', async function() {
        try {
            const numOfDays = 100;
            await liquidityMining.unlockPosition(accounts[0].address);        
        } catch (exception){
            expect(exception.toString()).to.endsWith(' Unlocking time has not arrived yet');
        }
    });

    it('should get entire rewards amount on minimum lock period', async function() {
        const numOfDays = 100;
        const bbsRewards = 1;
        await printBalance(0);
        await liquidityMining.connect(accounts[0]).lockPosition(numOfDays);
        await sendBBSToLM(bbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(accounts[0].address);
        const bbsBalancePlusRewards = await getBalance(accounts[0].address);
        expect(bbsBalancePlusRewards-BBS_INIT_BALANCE).to.equal(bbsRewards);
    });

    it('should get execpted rewards after 998 days', async function() {
        const numOfDays = 998;
        const bbsRewards = 1000;
        await printBalance(0);
        await liquidityMining.connect(accounts[0]).lockPosition(numOfDays);
        await sendBBSToLM(bbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(accounts[0].address);
        const bbsBalancePlusRewards = await getBalance(accounts[0].address);
        expect(bbsBalancePlusRewards-BBS_INIT_BALANCE).to.equal(999);
    });

    it('accounts with the same BBS stacking and lock time should get the same rewards', async function() {
        const numOfDays = 100;
        const bbsRewards = 14321;
        await printBalance(0);
        await printBalance(1);
        await liquidityMining.connect(accounts[0]).lockPosition(numOfDays);
        await liquidityMining.connect(accounts[1]).lockPosition(numOfDays);
        await sendBBSToLM(bbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(accounts[0].address);
        await liquidityMining.unlockPosition(accounts[1].address);
        account0Rewards = (await getBalance(accounts[0].address)) - BBS_INIT_BALANCE;
        account1Rewards = (await getBalance(accounts[1].address)) - BBS_INIT_BALANCE;
        printRewards(0, account0Rewards);
        printRewards(1, account1Rewards);
        expect(account0Rewards).to.equal(account1Rewards);
    });

    it('account with longer lock time period should get more rewards', async function() {
        const numOfDays = 200;
        const bbsRewards = 5000;
        await printBalance(0);
        await printBalance(1);
        await liquidityMining.connect(accounts[0]).lockPosition(numOfDays);
        await liquidityMining.connect(accounts[1]).lockPosition(numOfDays-5);
        await sendBBSToLM(bbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(accounts[0].address);
        await liquidityMining.unlockPosition(accounts[1].address);
        account0Rewards = (await getBalance(accounts[0].address)) - BBS_INIT_BALANCE;
        account1Rewards = (await getBalance(accounts[1].address)) - BBS_INIT_BALANCE;
        printRewards(0, account0Rewards);
        printRewards(1, account1Rewards);
        expect(account0Rewards).to.greaterThan(account1Rewards);
    });

    it('no rewards if no balance in lm contract', async function() {
        const numOfDays = 200;
        const bbsRewards = 5000;
        await printBalance(0);
        await printBalance(1);
        await liquidityMining.connect(accounts[0]).lockPosition(numOfDays);
        await liquidityMining.connect(accounts[1]).lockPosition(numOfDays-5);
        await sendBBSToLM(bbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(accounts[0].address);
        await liquidityMining.unlockPosition(accounts[1].address);
        printRewards(0, (await getBalance(accounts[0].address)) - BBS_INIT_BALANCE);
        printRewards(1, (await getBalance(accounts[1].address)) - BBS_INIT_BALANCE);

        await liquidityMining.connect(accounts[2]).lockPosition(numOfDays);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(accounts[2].address);
        printRewards(2, (await getBalance(accounts[2].address)) - BBS_INIT_BALANCE);
        expect((await getBalance(accounts[2].address)) - BBS_INIT_BALANCE).to.equal(0);
    });

    it('account lock&unlock several times', async function() {
        const numOfDays = 100;
        let bbsRewards = 5000;
        await printBalance(0);
        await liquidityMining.connect(accounts[0]).lockPosition(numOfDays);
        await sendBBSToLM(bbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(accounts[0].address);
        const rewardsFirstUnlock = (await getBalance(accounts[0].address)) - BBS_INIT_BALANCE;
        printRewards(0, rewardsFirstUnlock);
        expect(rewardsFirstUnlock).to.equal(bbsRewards);

        let balanceWithRewards = await getBalance(accounts[0].address);
        await sendBBSToLM(bbsRewards);
        await liquidityMining.connect(accounts[0]).lockPosition(numOfDays);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(accounts[0].address);
        const rewardsSecondUnlock = (await getBalance(accounts[0].address)) - balanceWithRewards;
        printRewards(0, rewardsSecondUnlock);
        expect(rewardsSecondUnlock).to.equal(4999);
    });
});
