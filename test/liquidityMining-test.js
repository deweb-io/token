const { expect } = require('chai').use(require('chai-string'));
const { ethers } = require('hardhat');
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3();

// These are ABIs were generated from the Bancor contracts, so we have full computability.
// We will probably have a script that generates them automatically from a given version.
const abis = {
    registry: JSON.parse(fs.readFileSync('./test/abis/ContractRegistry.abi', 'utf8')),
    liquidityProtection: JSON.parse(fs.readFileSync('./test/abis/LiquidityProtection.abi', 'utf8')),
    liquidityProtectionStore: JSON.parse(fs.readFileSync('./test/abis/LiquidityProtectionStore.abi', 'utf8'))
};

const STAKE_AMOUNT = 100;
const NUM_ACCOUNTS = 10; // Can't be bigger than the number of signers ethers supplies us.

// Set this environment variable to use a previously deployed contract.
// Posix shell usage example:
// BANCOR_ENV_REGISTRY="0x5c8152554B3c8F39c3F8d1dEe141cCeA4914517A" npx hardhat --network localhost test
const BANCOR_ENV_REGISTRY = process.env.BANCOR_ENV_REGISTRY;

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

        // I think Bancor's script deploys the token, so this should only be done when there is no running env.
        bbsToken = await (await ethers.getContractFactory('BBSToken')).deploy();

        // If the environment variable is set, get the existing contracts.
        if (BANCOR_ENV_REGISTRY) {
            console.log('running tests on existing environment');
            contractRegistry = await ethers.getContractAt(abis.registry, BANCOR_ENV_REGISTRY);
            liquidityProtection = await ethers.getContractAt(
                abis.liquidityProtection,
                (await contractRegistry.addressOf(ethers.utils.formatBytes32String('LiquidityProtection'))));
            liquidityProtectionStore = await ethers.getContractAt(
                abis.liquidityProtectionStore, (await liquidityProtection.store()));

        // Otherwise, deploy our mocks and register them.
        } else {
            console.log('running tests on ephemeral hardhat network');

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

    it('should fail on unlocking before locking', async function() {
        try {
            const numOfDays = 100;
            await liquidityMining.unlockPosition(0);
        } catch (exception){
            expect(exception.toString()).to.endsWith('position id is not mapped to a valid address');
        }
    });

    async function sendBBSToLM(amount) {
        console.log(`Send ${amount} BBS to lm contract`);
        await bbsToken.mint(amount);
        await bbsToken.transfer(liquidityMining.address, amount)
    }

    async function increaseTime(numOfDays) {
        await network.provider.send('evm_increaseTime', [(numOfDays * 60 * 60 * 24 )]);
    }

    async function getBalance(address) {
        return (await bbsToken.balanceOf(address)).toNumber(10);
    }

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

    function AbiEncodeLockPositionCall(positionId, numberOfDays, returnAddress) {
        return web3.eth.abi.encodeFunctionCall(
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

    async function transferPositionAndCallWrapper(postionId, numberOfDays) {
        const data = AbiEncodeLockPositionCall(postionId, numberOfDays, accounts[postionId].address);
        await liquidityProtection.transferPositionAndCall(postionId, liquidityMining.address, liquidityMining.address, data);
    }

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

    function printRewards(accountIndex, rewards) {
        console.log(`account ${accountIndex} receieved rewards: ${rewards}`);
    }

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
