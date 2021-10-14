const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const STACKING_ADDRESS = common.getStakingAddress();


async function main() {
    log(`---Approve Staking to Spend BBS---`);

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting.');

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    // approve
    const numberOfQuarters = config.rewards.quartes.length;
    const rewardAmountWei = hardhat.ethers.BigNumber.from(hardhat.ethers.utils.parseEther(config.rewards.amount));
    const totalApproveAmountWei = rewardAmountWei.mul(numberOfQuarters);

    // If allowance was not already given, do it
    const accounts = await ethers.getSigners();
    const deployer = accounts[0].address;
    const currentAllowence = await bbsToken.allowance(deployer, STACKING_ADDRESS);
    if (currentAllowence.lt(totalApproveAmountWei)) {
        log('Approving Stacking...');
        await bbsToken.approve(STACKING_ADDRESS, totalApproveAmountWei);
    } else {
        log(`Stacking already has allowance of ${currentAllowence}`);
    }

    log('---Approve Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});