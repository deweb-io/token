const fs = require('fs');
const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();

async function main() {
    log('---Deployment of DailyRewards---');

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    log('Deploying DailyRewards...');
    const DailyRewards = await hardhat.ethers.getContractFactory('DailyRewards');
    const dailyRewards = await DailyRewards.deploy(BBS_TOKEN_ADDRESS);
    common.etherscanLogContract(dailyRewards.address, dailyRewards.deployTransaction.chainId);
    fs.writeFileSync(common.dailyRewardsPath, dailyRewards.address);

    log('---Deployment of DailyRewards Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
