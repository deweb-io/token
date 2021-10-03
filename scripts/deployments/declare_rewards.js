const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');

const BBS_TOKEN_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bbsToken.txt`, 'utf8').toString();
const STACKING_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/staking.txt`, 'utf8').toString();

async function main() {
    if (!BBS_TOKEN_ADDRESS) {
        throw new Error('BBS token address is missing. aborting');
    }

    if (!STACKING_ADDRESS) {
        throw new Error('No Stacking address is missing. aborting');
    }

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Staking = await ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    // approve
    const numberOfQuarters = config.rewards.quartes.length;
    const rewardAmountWei = hardhat.ethers.BigNumber.from(hardhat.ethers.utils.parseEther(config.rewards.amount));
    const totalApproveAmountWei = rewardAmountWei.mul(numberOfQuarters);
    await bbsToken.approve(STACKING_ADDRESS, totalApproveAmountWei);

    // declare rewards
    await Promise.all(config.rewards.quartes.map(quarterIndex => staking.declareReward(quarterIndex, rewardAmountWei)))
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});