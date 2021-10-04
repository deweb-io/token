const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');

const LOGFILE = `${__dirname}/log.txt`;
const BBS_TOKEN_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bbsToken.txt`, 'utf8').toString();
const STACKING_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/staking.txt`, 'utf8').toString();


async function main() {
    log(`---Declare rewards | ${new Date()}---`);
    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting.');

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Staking = await ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    // approve
    const numberOfQuarters = config.rewards.quartes.length;
    const rewardAmountWei = hardhat.ethers.BigNumber.from(hardhat.ethers.utils.parseEther(config.rewards.amount));
    const totalApproveAmountWei = rewardAmountWei.mul(numberOfQuarters);

    // If allowance was not alreay given, do it
    const accounts = await ethers.getSigners();
    const deployer = accounts[0].address;
    const allowence = await bbsToken.allowance(deployer, STACKING_ADDRESS);
    if (!allowence.eq(totalApproveAmountWei)) {
        log('Approving Stacking...');
        await bbsToken.approve(STACKING_ADDRESS, totalApproveAmountWei);
    }

    for (const quarterIndex of config.rewards.quartes) {
        const quarter = await staking.quarters(quarterIndex);
        const currentRewardWei = quarter.reward;

        if (currentRewardWei.gt(rewardAmountWei)) {
            log(`Quarter ${quarterIndex} already has a BIGGER reward (${currentRewardWei}) then configured ${rewardAmountWei}. skipping.`);
            continue;
        }

        if (currentRewardWei.eq(rewardAmountWei)) {
            log(`Quarter ${quarterIndex} already has a reward: ${currentRewardWei}. skipping.`);
            continue;
        }

        // calculate reward to be added to quarter
        const rewardToAddWei = rewardAmountWei.sub(currentRewardWei);
        log(`Decalring rewards for quarter ${quarterIndex}, amount (wei): ${rewardToAddWei}`);
        await staking.declareReward(quarterIndex, rewardToAddWei);
    }

    log(`--- Declare rewards Done | ${new Date()}---`);
}

function log(data) {
    console.log(data);
    fs.appendFileSync(LOGFILE, data + '\n');
}


main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    log(error)
    process.exit(1);
});