const { expect } = require('chai');
const chai = require('chai');
chai.use(require('chai-string'));

const Web3 = require('web3');
const web3Abi = new Web3().eth.abi;
const web3Utils = new Web3().utils;

const BBS_INIT_STACKING = 100;
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
        
        LiquidityProtectionStore = await ethers.getContractFactory('mockLiquidityProtectionStore');
        liquidityProtectionStore = await LiquidityProtectionStore.deploy();
        await Promise.all(accounts.map(async (account) => {
            await liquidityProtectionStore.addProtectedLiquidity(account.address, BBS_INIT_STACKING);
        }));

        LiquidityProtection = await ethers.getContractFactory('mockLiquidityProtection');
        liquidityProtection = await LiquidityProtection.deploy(liquidityProtectionStore.address);
        

        ContractRegistry = await ethers.getContractFactory('mockContractRegistry');
        contractRegistry = await ContractRegistry.deploy();
        
        await contractRegistry.addContract(liquidityProtection.address, 
            web3Abi.encodeParameter('bytes32', web3Utils.utf8ToHex('LiquidityProtection')));
        await contractRegistry.addContract(liquidityProtectionStore.address, 
            web3Abi.encodeParameter('bytes32', web3Utils.utf8ToHex('LiquidityProtectionStore')));
        
        LiquidityMining = await ethers.getContractFactory('LiquidityMining');
        liquidityMining = await LiquidityMining.deploy(bbsToken.address, contractRegistry.address);
    });

    function getDaysTillTimestamp(timestamp, since) {
        //note : since is not a number - it is an object (bigNumber probably).
        if(!since) since = startTime;
        return Math.floor((timestamp - since) / 60 / 60 / 24) + ' days';
    }

    function AbiEncodeLockPositionCall(positionId, numberOfDays, address) {
        return web3Abi.encodeFunctionCall(
            {
                "name": "lockPosition",
                "type": "function",
                "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_positionId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint16",
                    "name": "_numberOfDays",
                    "type": "uint16"
                },
                {
                    "internalType": "address",
                    "name": "_returnAddress",
                    "type": "address"
                }
                ],
            },
            [
                positionId, numberOfDays, address
            ]
        );
    }

    async function printBalance(accountIndex) {
        //console.log(`account ${accountIndex} has ${await getBalance(accounts[accountIndex].address)} bbs`);
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
            let lockedAccount = await liquidityMining.lockedPositions(index);
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
                await liquidityMining.lockPosition(0, period, accounts[0].address);
            } catch(exception) {
                expect(exception.toString()).to.endsWith(' Illeagal lock period (Lock account for 100 - 1100 days)');
            }
        }
    });

    it('test call by liquidityProtection contract', async function() {
        for(let period of [99, 1101]) {
            try {
                const data = AbiEncodeLockPositionCall(0, period, accounts[0].address);
                await liquidityProtection.transferPositionAndCall(0, liquidityMining.address, liquidityMining.address, data);
            } catch(exception) {
                expect(exception.toString()).to.endsWith(' Illeagal lock period (Lock account for 100 - 1100 days)');
            }
        }
    });

    // it('should create new locks', async function() {
    //     await Promise.all(accounts.map(async (account, index) => {
    //         await liquidityMining.lockPosition(index, 
    //             100 + Math.floor(1000 / accounts.length * (index + 1), 
    //             liquidityMining.address));
    //     }));
    //    // console.log(await stats());
    // });

    it('should fail on unlocking time has not arrived yet', async function() {
        try {
            const numOfDays = 100;
            const bbsRewards = 1000;
            await liquidityMining.lockPosition(0, numOfDays, accounts[0].address);
            await sendBBSToLM(bbsRewards);
            await liquidityMining.unlockPosition(0)            
        } catch (exception){
            expect(exception.toString()).to.endsWith(' Unlocking time has not arrived yet');
        }
    });

    // it('should fail on unlocking before locking', async function() {
    //     try {
    //         const numOfDays = 100;
    //         await liquidityMining.unlockPosition(0);        
    //     } catch (exception){
    //         expect(exception.toString()).to.endsWith(' Unlocking time has not arrived yet');
    //     }
    // });

    it('should get entire rewards amount on minimum lock period', async function() {
        const numOfDays = 100;
        const totalBBSRewards = 1;
        const positionId = 0;
        await printBalance(0);
        await liquidityMining.lockPosition(positionId, numOfDays, accounts[0].address);
        await sendBBSToLM(totalBBSRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(positionId);
        const bbsRewards = await getBalance(accounts[0].address);
        expect(bbsRewards).to.equal(totalBBSRewards);
    });

    it('should get execpted rewards after 998 days', async function() {
        const numOfDays = 998;
        const totalBBSRewards = 1000;
        const positionId = 0;
        await printBalance(0);
        await liquidityMining.lockPosition(positionId, numOfDays, accounts[0].address);
        await sendBBSToLM(totalBBSRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(positionId);
        const bbsRewards = await getBalance(accounts[0].address);
        expect(bbsRewards).to.equal(999);
    });

    it('accounts with the same BBS stacking and lock time should get the same rewards', async function() {
        const numOfDays = 100;
        const totalBBSRewards = 14321;
        await printBalance(0);
        await printBalance(1);
        await liquidityMining.lockPosition(0, numOfDays, accounts[0].address);
        await liquidityMining.lockPosition(1, numOfDays, accounts[1].address);
        await sendBBSToLM(totalBBSRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(0);
        await liquidityMining.unlockPosition(1);
        account0Rewards = (await getBalance(accounts[0].address));
        account1Rewards = (await getBalance(accounts[1].address));
        printRewards(0, account0Rewards);
        printRewards(1, account1Rewards);
        expect(account0Rewards).to.equal(account1Rewards);
    });

    it('account with longer lock time period should get more rewards', async function() {
        const numOfDays = 200;
        const bbsRewards = 5000;
        await printBalance(0);
        await printBalance(1);
        await liquidityMining.lockPosition(0, numOfDays, accounts[0].address);
        await liquidityMining.lockPosition(1, numOfDays-5, accounts[1].address);
        await sendBBSToLM(bbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(0);
        await liquidityMining.unlockPosition(1);
        account0Rewards = (await getBalance(accounts[0].address));
        account1Rewards = (await getBalance(accounts[1].address));
        printRewards(0, account0Rewards);
        printRewards(1, account1Rewards);
        expect(account0Rewards).to.greaterThan(account1Rewards);
    });

    it('no rewards if no balance in lm contract', async function() {
        const numOfDays = 200;
        const totalBbsRewards = 5000;
        await printBalance(0);
        await printBalance(1);
        await liquidityMining.lockPosition(0, numOfDays, accounts[0].address);
        await liquidityMining.lockPosition(1, numOfDays-5, accounts[1].address);
        await sendBBSToLM(totalBbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(0);
        await liquidityMining.unlockPosition(1);
        printRewards(0, (await getBalance(accounts[0].address)));
        printRewards(1, (await getBalance(accounts[1].address)));

        await liquidityMining.lockPosition(2, numOfDays, accounts[0].address);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(2);
        printRewards(2, (await getBalance(accounts[2].address)));
        expect((await getBalance(accounts[2].address))).to.equal(0);
    });

    it('account lock&unlock several times', async function() {
        const numOfDays = 100;
        let totalBbsRewards = 5000;
        await printBalance(0);
        await liquidityMining.lockPosition(0, numOfDays, accounts[0].address);
        await sendBBSToLM(totalBbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(0);
        const rewardsFirstUnlock = (await getBalance(accounts[0].address));
        printRewards(0, rewardsFirstUnlock);
        expect(rewardsFirstUnlock).to.equal(totalBbsRewards);

        let balanceWithRewards = await getBalance(accounts[0].address);
        await sendBBSToLM(totalBbsRewards);
        await liquidityMining.lockPosition(0, numOfDays, accounts[0].address);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(0);
        const rewardsSecondUnlock = (await getBalance(accounts[0].address)) - balanceWithRewards;
        printRewards(0, rewardsSecondUnlock);
        expect(rewardsSecondUnlock).to.equal(totalBbsRewards);
    });
});
