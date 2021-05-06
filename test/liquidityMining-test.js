const { expect } = require('chai');
const fs = require('fs');
const chai = require('chai');
chai.use(require('chai-string'));
const { ethers } = require('hardhat');
const Web3 = require('web3');

const web3 = new Web3();
const web3Abi = web3.eth.abi;
const web3Utils = web3.utils;

const abis = {
    registry: JSON.parse(fs.readFileSync('./test/abis/ContractRegistry.abi', 'utf8')),
    liquidityProtection: JSON.parse(fs.readFileSync('./test/abis/LiquidityProtection.abi', 'utf8')),
    liquidityProtectionStore: JSON.parse(fs.readFileSync('./test/abis/LiquidityProtectionStore.abi', 'utf8'))
};

const BBS_INIT_STACKING = 100;
const MAX_ACCOUNTS = 10;

/**
 * for example: BANCOR_ENV_REGISTRY="0x5c8152554B3c8F39c3F8d1dEe141cCeA4914517A" npx hardhat --network localhost test liquidityMining-test.js
 */
const BANCOR_ENV_REGISTRY = process.env.BANCOR_ENV_REGISTRY;


describe('LiquidityMining', function() {
    let startTime;
    let accounts;
    let BBSToken;
    let bbsToken;
    let LiquidityMining;
    let liquidityMining;
    let contractRegistry;
    let liquidityProtection;
    let liquidityProtectionStore;

    beforeEach(async function() {
        startTime = Math.floor(new Date / 1000);
        currentTime = startTime;
        accounts = (await ethers.getSigners()).slice(0, MAX_ACCOUNTS);

        //deploy BBS token
        BBSToken = await ethers.getContractFactory('BBSToken');
        bbsToken = await BBSToken.deploy();

        if (BANCOR_ENV_REGISTRY) {
            console.log('running tests on localhost');
            //get deployed contracts
            contractRegistry = await ethers.getContractAt(abis.registry, BANCOR_ENV_REGISTRY);
            liquidityProtectionAddress = await contractRegistry.addressOf(ethers.utils.formatBytes32String('LiquidityProtection'));
            liquidityProtection = await ethers.getContractAt(abis.liquidityProtection, liquidityProtectionAddress);
            liquidityProtectionStoreAddress = await liquidityProtection.store();
            liquidityProtectionStore = await ethers.getContractAt(abis.liquidityProtectionStore, liquidityProtectionStoreAddress);

            //deploy liquidityMining contract
            LiquidityMining = await ethers.getContractFactory('LiquidityMining');
            liquidityMining = await LiquidityMining.deploy(bbsToken.address, BANCOR_ENV_REGISTRY);
        } else {
            console.log('running tests on in-memory instance hardhat network');
            LiquidityProtectionStore = await ethers.getContractFactory('mockLiquidityProtectionStore');
            liquidityProtectionStore = await LiquidityProtectionStore.deploy();

            await Promise.all(accounts.map(async (account, index) => {
                await liquidityProtectionStore.addProtectedLiquidity(
                        account.address,
                        accounts[8].address,
                        accounts[9].address,
                        1,
                        BBS_INIT_STACKING,
                        1,
                        1,
                        1);
                console.log(`account ${index} stacking: <${accounts[index].address},${BBS_INIT_STACKING}>`);
            }));

            LiquidityProtection = await ethers.getContractFactory('mockLiquidityProtection');
            liquidityProtection = await LiquidityProtection.deploy(liquidityProtectionStore.address);

            ContractRegistry = await ethers.getContractFactory('mockContractRegistry');
            contractRegistry = await ContractRegistry.deploy();

            await contractRegistry.registerAddress(web3Abi.encodeParameter(
                'bytes32', web3Utils.asciiToHex('LiquidityProtection')
            ), liquidityProtection.address);

            LiquidityMining = await ethers.getContractFactory('LiquidityMining');
            liquidityMining = await LiquidityMining.deploy(bbsToken.address, contractRegistry.address);
        }
        printContracts();
    });

    function printContracts() {
        console.log('####### Contracts #######');
        printContractDetails('ContractRegistry', contractRegistry.address);
        printContractDetails('LiquidityMining', liquidityMining.address);
        printContractDetails('LiquidityProtection', liquidityProtection.address);
        printContractDetails('LiquidityProtectionStore', liquidityProtectionStore.address);
        printContractDetails('BBS token', bbsToken.address);
        console.log('#########################');
    }

    function printContractDetails(name, addrees) {
        console.log(`${name} is deployed at ${addrees}`);
    }

    function getDaysTillTimestamp(timestamp, since) {
        //note : since is not a number - it is an object (bigNumber probably).
        if(!since) since = startTime;
        return Math.floor((timestamp - since) / 60 / 60 / 24) + ' days';
    }

    function AbiEncodeLockPositionCall(positionId, numberOfDays, returnAddress) {
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
                positionId, numberOfDays, returnAddress
            ]
        );
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

    async function transferPositionAndCallWrapper(postionId, numberOfDays) {
        const data = AbiEncodeLockPositionCall(postionId, numberOfDays, accounts[postionId].address);
        await liquidityProtection.transferPositionAndCall(postionId, liquidityMining.address, liquidityMining.address, data);
    }

    // Tests with direct calls to liquidity mining contract

    it('should fail on illegal lock periods', async function() {
        for(let numberOfDays of [99, 1101]) {
            try {
                await liquidityMining.lockPosition(0, numberOfDays, accounts[0].address);
            } catch(exception) {
                expect(exception.toString()).to.endsWith('Illeagal lock period (Lock account for 100 - 1100 days)');
            }
        }
    });

    it('should fail on unlocking before locking', async function() {
        try {
            const numOfDays = 100;
            await liquidityMining.unlockPosition(0);        
        } catch (exception){
            expect(exception.toString()).to.endsWith('position id is not mapped to a valid address');
        }
    });

    it('should get entire rewards amount on minimum lock numberOfDays - direct to call to lm contract', async function() {
        const numOfDays = 100;
        const totalBBSRewards = 1;
        const positionId = 1;
        await liquidityMining.lockPosition(positionId, numOfDays, accounts[1].address);
        await sendBBSToLM(totalBBSRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(positionId);
        const bbsRewards = await getBalance(accounts[1].address);
        expect(bbsRewards).to.equal(totalBBSRewards);
    });

    // Tests with call to transferPositionAndCall

    it('should fail on unlocking time has not arrived yet', async function() {
        try {
            const numOfDays = 100;
            const bbsRewards = 1000;
            const positionId = 0;
            await transferPositionAndCallWrapper(positionId, numOfDays);
            await sendBBSToLM(bbsRewards);
            await liquidityMining.unlockPosition(positionId)            
        } catch (exception){
            expect(exception.toString()).to.endsWith('Unlocking time has not arrived yet');
        }
    });

    it('should get entire rewards amount on minimum lock numberOfDays', async function() {
        const numOfDays = 100;
        const totalBBSRewards = 1;
        const positionId = 0;
        await transferPositionAndCallWrapper(positionId, numOfDays);
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
        await transferPositionAndCallWrapper(positionId, numOfDays);
        await sendBBSToLM(totalBBSRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(positionId);
        const bbsRewards = await getBalance(accounts[0].address);
        expect(bbsRewards).to.equal(999);
    });

    it('accounts with the same BBS stacking and lock time should get the same rewards', async function() {
        const numOfDays = 100;
        const totalBBSRewards = 14321;
        await transferPositionAndCallWrapper(0, numOfDays);
        await transferPositionAndCallWrapper(1, numOfDays);
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

    it('account with longer lock time should get more rewards', async function() {
        const numOfDays = 200;
        const bbsRewards = 5000;
        await transferPositionAndCallWrapper(0, numOfDays);
        await transferPositionAndCallWrapper(1, numOfDays-5);
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
        await transferPositionAndCallWrapper(0, numOfDays);
        await transferPositionAndCallWrapper(1, numOfDays-5);
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
        await transferPositionAndCallWrapper(0, numOfDays);
        await sendBBSToLM(totalBbsRewards);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(0);
        const rewardsFirstUnlock = (await getBalance(accounts[0].address));
        printRewards(0, rewardsFirstUnlock);
        expect(rewardsFirstUnlock).to.equal(totalBbsRewards);

        let balanceWithRewards = await getBalance(accounts[0].address);
        await sendBBSToLM(totalBbsRewards);
        await transferPositionAndCallWrapper(0, numOfDays);
        await increaseTime(numOfDays);
        await liquidityMining.unlockPosition(0);
        const rewardsSecondUnlock = (await getBalance(accounts[0].address)) - balanceWithRewards;
        printRewards(0, rewardsSecondUnlock);
        expect(rewardsSecondUnlock).to.equal(totalBbsRewards);
    });
});
