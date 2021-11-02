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
    let totalApproveAmountWei = hardhat.ethers.BigNumber.from(0);
    config.rewards.forEach(reward => {
        totalApproveAmountWei = totalApproveAmountWei.add(hardhat.ethers.BigNumber.from(hardhat.ethers.utils.parseEther(reward.amount)));
    })

    // If allowance was not already given, do it
    const accounts = await ethers.getSigners();
    const signer = accounts[0].address;
    const currentAllowence = await bbsToken.allowance(signer, STACKING_ADDRESS);
    log(`Required allowence is (wei): ${totalApproveAmountWei}`);
    log(`Current allowence is (wei):  ${currentAllowence}`);
    if (currentAllowence.lt(totalApproveAmountWei)) {

        log(`Adding allowence of ${totalApproveAmountWei.sub(currentAllowence)}`);
        await bbsToken.approve(STACKING_ADDRESS, totalApproveAmountWei);
    } else {
        log(`Stacking already has allowance of at least ${totalApproveAmountWei}`);
    }

    log('---Approve Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});