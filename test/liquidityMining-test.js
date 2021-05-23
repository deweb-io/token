const { expect } = require('chai').use(require('chai-string'));
const { ethers } = require('hardhat');
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3();

// These are ABIs were generated from the Bancor contracts, so we have full computability.
// We will probably have a script that generates them automatically from a given version.
const abis = {
    registry: JSON.parse(fs.readFileSync('./abis/ContractRegistry.abi', 'utf8')),
    liquidityProtection: JSON.parse(fs.readFileSync('./abis/LiquidityProtection.abi', 'utf8')), //TODO: update abis
    liquidityProtectionStore: JSON.parse(fs.readFileSync('./abis/LiquidityProtectionStore.abi', 'utf8')),
    dsToken: JSON.parse(fs.readFileSync('./abis/DSToken.abi', 'utf8')),
};

const LP_APPROVE_AMOUNT = 10000000000;
const STAKE_AMOUNT = 100;
const NUM_ACCOUNTS = 10; // Can't be bigger than the number of signers ethers supplies us.

// Set this environment variables to use previously deployed contracts.
// Posix shell usage example:
// BANCOR_ENV_REGISTRY="0xF2E246BB76DF876Cef8b38ae84130F4F55De395b" BANCOR_ENV_BBS="0xFEe587E68c470DAE8147B46bB39fF230A29D4769" BANCOR_ENV_BBSBNT="0xDCb55CBB56DF9EFA14f16211D38E9246AdA1A266" npx hardhat --network localhost test liquidityMining-test.js
const BANCOR_ENV_REGISTRY = process.env.BANCOR_ENV_REGISTRY;
const BANCOR_ENV_BBS = process.env.BANCOR_ENV_BBS;
const BANCOR_ENV_BBSBNT = process.env.BANCOR_ENV_BBSBNT;

describe('LiquidityMining', function() {
    let startTime;
    let accounts;
    let bbsToken;
    let liquidityMining;
    let contractRegistry;
    let liquidityProtection;
    let liquidityProtectionStore;

    function printContractDetails(name, addrees) {
        console.log(`${name} is deployed at ${addrees}`);
    }

    function printContracts() {
        console.log('####### Contracts #######');
        printContractDetails('ContractRegistry', contractRegistry && contractRegistry.address);
        printContractDetails('LiquidityMining', liquidityMining && liquidityMining.address);
        printContractDetails('LiquidityProtection', liquidityProtection && liquidityProtection.address);
        printContractDetails('LiquidityProtectionStore', liquidityProtectionStore && liquidityProtectionStore.address);
        printContractDetails('BBS token', bbsToken && bbsToken.address);
        console.log('#########################');
    }

    beforeEach(async function() {
        startTime = Math.floor(new Date / 1000);
        currentTime = startTime;
        accounts = (await ethers.getSigners()).slice(0, NUM_ACCOUNTS);

        // If the environment variable is set, get the existing contracts.
        if (BANCOR_ENV_REGISTRY) {
            console.log('running tests on existing environment');
            bbsToken = await ethers.getContractAt(abis.dsToken, BANCOR_ENV_BBS);
            contractRegistry = await ethers.getContractAt(abis.registry, BANCOR_ENV_REGISTRY);
            liquidityProtection = await ethers.getContractAt(
                abis.liquidityProtection,
                (await contractRegistry.addressOf(ethers.utils.formatBytes32String('LiquidityProtection'))));
            liquidityProtectionStore = await ethers.getContractAt(
                abis.liquidityProtectionStore, (await liquidityProtection.store()));

            // Deploy liquidityMining contract
            LiquidityMining = await ethers.getContractFactory('LiquidityMining');
            liquidityMining = await LiquidityMining.deploy(BANCOR_ENV_BBS, BANCOR_ENV_REGISTRY);
            
            // Before adding BBS liquidity, you need to approve the LP contract to transfer BBS tokens
            await bbsToken.approve(liquidityProtection.address, LP_APPROVE_AMOUNT);

            // Add protected liquidity to BBSBNT pool for account-0
            await liquidityProtection.addLiquidityFor(accounts[0].address, BANCOR_ENV_BBSBNT, BANCOR_ENV_BBS, STAKE_AMOUNT);
        // Otherwise, deploy our mocks and register them.
        } else {
            console.log('running tests on ephemeral hardhat network');
            bbsToken = await (await ethers.getContractFactory('BBSToken')).deploy();

            async function deploy(contractName, ...args) {
                return await (await ethers.getContractFactory(contractName)).deploy(...args);
            }

            async function deployAndRegister(contractName, registryName, ...args) {
                const deployed = await deploy(contractName, ...args);
                if(contractRegistry) {
                    await contractRegistry.registerAddress(web3.eth.abi.encodeParameter(
                        'bytes32', web3.utils.asciiToHex(registryName)
                    ), deployed.address);
                }
                return deployed;
            }

            contractRegistry = await deploy('mockContractRegistry');
            liquidityProtectionStore = await deployAndRegister(
                'mockLiquidityProtectionStore', 'LiquidityProtectionStore');
            liquidityProtection = await deployAndRegister(
                'mockLiquidityProtection', 'LiquidityProtection', liquidityProtectionStore.address);
            liquidityMining = await deployAndRegister(
                'LiquidityMining', 'LiquidityMining', bbsToken.address, contractRegistry.address);

            // This should happen on existing env as well, unless we stuff it into the config of Bancor's deployment.
            await Promise.all(accounts.map(async (account, index) => {
                await liquidityProtectionStore.addProtectedLiquidity(
                        account.address,
                        accounts[8].address,
                        accounts[9].address,
                        1,
                        STAKE_AMOUNT,
                        1,
                        1,
                        1);
                console.log(`account ${index} stacking: <${accounts[index].address},${STAKE_AMOUNT}>`);
            }));
        }
        printContracts();
    });

    // Tests with direct calls to liquidity mining contract

    async function increaseTime(numOfDays) {
        await network.provider.send('evm_increaseTime', [(numOfDays * 60 * 60 * 24 )]);
    }

    async function getPositionIdAt(address, index) {
        const positionsIds = await liquidityMining.getPositions(address);
        console.log(`positionsIds = ${JSON.stringify(positionsIds)}`);
        return (await liquidityMining.getPositions(address))[index].toNumber(10);  
    }

    it('should fail on illegal lock periods', async function() {
        for(let numberOfDays of [99, 1101]) {
            let error = '';
            try {
                await liquidityMining.lockPosition(0, numberOfDays, accounts[0].address);
            } catch(exception) {
                error = exception.toString();
            }
            expect(error).to.endsWith('Illeagal lock period (Lock account for 100 - 1100 days)');
        }
    });

    it('should fail on position id is not mapped to a valid address', async function() {
        try {
            await liquidityMining.unlockPosition(0);
        } catch (exception){
            expect(exception.toString()).to.endsWith('position id is not mapped to a valid address');
        }
    });

    it('ensure position was created on lm contract', async function() {
        const numOfDays = 100;
        const positionId = 0;
        await liquidityMining.lockPosition(positionId, numOfDays, accounts[positionId].address);
        await increaseTime(numOfDays);
        const expectedPositionId = await getPositionIdAt(accounts[positionId].address, 0);
        expect(expectedPositionId).to.equal(positionId);
    });

    it('should fail on unlocking time has not arrived yet', async function() {
        try {
            const numOfDays = 100;
            const positionId = 0;
            await liquidityMining.lockPosition(positionId, numOfDays, accounts[positionId].address);
            await increaseTime(numOfDays-1);
            await liquidityMining.unlockPosition(positionId);
        } catch (exception){
           expect(exception.toString()).to.endsWith('Unlocking time has not arrived yet');
        }
    });

    // Tests with call to transferPositionAndNotify

    async function sendBBSToLM(amount) {
        console.log(`Send ${amount} BBS to lm contract`);
        await bbsToken.issue(accounts[0].address, amount);
        await bbsToken.transfer(liquidityMining.address, amount);
    }

    /**
     * Returns balance in ethers.BigNumber type
     * @param {*} address 
     */
    async function getBalance(address) {
        return (ethers.BigNumber.from(await bbsToken.balanceOf(address)));
    }

    async function transferPositionAndNotifyWrapper(postionId, address, numberOfDays) {
        const data = web3.eth.abi.encodeParameters(['uint16', 'address'], [numberOfDays, address]);
        // LiquidityMining contract is the new provider and the callback address
        await liquidityProtection.transferPositionAndNotify(postionId, liquidityMining.address, liquidityMining.address, data);
    }

    it('should get entire rewards amount on minimum lock numberOfDays', async function() {
        const numOfDays = 100;
        const totalBBSRewards = 1;
        const positionId = 0;
        await transferPositionAndNotifyWrapper(positionId, accounts[0].address, numOfDays);
        await sendBBSToLM(totalBBSRewards);
        await increaseTime(numOfDays);
        const newPositionId = await getPositionIdAt(accounts[0].address, 0);
        const balanceBeforeUnlock = await getBalance(accounts[0].address);
        await liquidityMining.unlockPosition(newPositionId);
        let balanceAfterUnlock = await getBalance(accounts[0].address);

        
        expect(balanceAfterUnlock.sub(balanceBeforeUnlock).toNumber()).to.equal(totalBBSRewards);
    });

    // it('should get execpted rewards after 998 days', async function() {
    //     const numOfDays = 998;
    //     const totalBBSRewards = 1000;
    //     const positionId = 0;
    //     await transferPositionAndNotifyWrapper(positionId, accounts[0].address, numOfDays);
    //     await sendBBSToLM(totalBBSRewards);
    //     await increaseTime(numOfDays);
    //     const newPositionId = await getPositionIdAt(accounts[0].address, 0);
    //     await liquidityMining.unlockPosition(newPositionId);
    //     const bbsRewards = await getBalance(accounts[0].address);
    //     expect(bbsRewards).to.equal(999);
    // });

    // function printRewards(accountIndex, rewards) {
    //     console.log(`account ${accountIndex} receieved rewards: ${rewards}`);
    // }

    // it('accounts with the same BBS stacking and lock time should get the same rewards', async function() {
    //     const numOfDays = 100;
    //     const totalBBSRewards = 14321;
    //     await transferPositionAndNotifyWrapper(0, accounts[0].address, numOfDays);
    //     await transferPositionAndNotifyWrapper(1, accounts[1].address, numOfDays);
    //     await sendBBSToLM(totalBBSRewards);
    //     await increaseTime(numOfDays);
    //     const newPosId0 = await getPositionIdAt(accounts[0].address, 0);
    //     const newPosId1 = await getPositionIdAt(accounts[1].address, 0);
    //     await liquidityMining.unlockPosition(newPosId0);
    //     await liquidityMining.unlockPosition(newPosId1);
    //     account0Rewards = (await getBalance(accounts[0].address));
    //     account1Rewards = (await getBalance(accounts[1].address));
    //     printRewards(0, account0Rewards);
    //     printRewards(1, account1Rewards);
    //     expect(account0Rewards).to.equal(account1Rewards);
    // });

    // it('account with longer lock time should get more rewards', async function() {
    //     const numOfDays = 200;
    //     const bbsRewards = 5000;
    //     await transferPositionAndNotifyWrapper(0, accounts[0].address, numOfDays);
    //     await transferPositionAndNotifyWrapper(1, accounts[1].address, numOfDays-5);
    //     await sendBBSToLM(bbsRewards);
    //     await increaseTime(numOfDays);
    //     const newPosId0 = await getPositionIdAt(accounts[0].address, 0);
    //     const newPosId1 =await getPositionIdAt(accounts[1].address, 0);
    //     await liquidityMining.unlockPosition(newPosId0);
    //     await liquidityMining.unlockPosition(newPosId1);
    //     account0Rewards = (await getBalance(accounts[0].address));
    //     account1Rewards = (await getBalance(accounts[1].address));
    //     printRewards(0, account0Rewards);
    //     printRewards(1, account1Rewards);
    //     expect(account0Rewards).to.greaterThan(account1Rewards);
    // });

    // it('no rewards if no balance in lm contract', async function() {
    //     const numOfDays = 200;
    //     const totalBbsRewards = 5000;
    //     await transferPositionAndNotifyWrapper(0, accounts[0].address, numOfDays);
    //     await transferPositionAndNotifyWrapper(1, accounts[1].address, numOfDays-5);
    //     await sendBBSToLM(totalBbsRewards);
    //     await increaseTime(numOfDays);
    //     const newPosId0 = await getPositionIdAt(accounts[0].address, 0);
    //     const newPosId1 =await getPositionIdAt(accounts[1].address, 0);
    //     await liquidityMining.unlockPosition(newPosId0);
    //     await liquidityMining.unlockPosition(newPosId1);
    //     printRewards(0, (await getBalance(accounts[0].address)));
    //     printRewards(1, (await getBalance(accounts[1].address)));
    //     await liquidityMining.lockPosition(newPosId0, numOfDays, accounts[0].address);
    //     await increaseTime(numOfDays);
    //     const newPosIdSecondTime = await getPositionIdAt(accounts[0].address, 0);
    //     await liquidityMining.unlockPosition(newPosIdSecondTime);
    //     printRewards(2, (await getBalance(accounts[2].address)));
    //     expect((await getBalance(accounts[2].address))).to.equal(0);
    // });

    // it('account lock&unlock several times', async function() {
    //     const numOfDays = 100;
    //     let totalBbsRewards = 5000;

    //     await transferPositionAndNotifyWrapper(0, accounts[0].address, numOfDays);
    //     await sendBBSToLM(totalBbsRewards);
    //     await increaseTime(numOfDays);
    //     let newPositionId = await getPositionIdAt(accounts[0].address, 0);
    //     await liquidityMining.unlockPosition(newPositionId);
    //     const rewardsFirstUnlock = (await getBalance(accounts[0].address));
    //     printRewards(0, rewardsFirstUnlock);
    //     expect(rewardsFirstUnlock).to.equal(totalBbsRewards);

    //     let balanceWithRewards = await getBalance(accounts[0].address);
    //     newPositionId = await getPositionIdAt(accounts[0].address, 1);
    //     await transferPositionAndNotifyWrapper(newPositionId, accounts[0].address, numOfDays);
    //     await sendBBSToLM(totalBbsRewards);
    //     await increaseTime(numOfDays);
    //     newPositionId = await getPositionIdAt(accounts[0].address, 1);
    //     await liquidityMining.unlockPosition(newPositionId);
    //     const rewardsSecondUnlock = (await getBalance(accounts[0].address)) - balanceWithRewards;
    //     printRewards(0, rewardsSecondUnlock);
    //     expect(rewardsSecondUnlock).to.equal(totalBbsRewards);
    // });
});
