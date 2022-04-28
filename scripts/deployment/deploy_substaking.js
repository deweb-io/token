const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = config.subStaking.bbsToken;

async function main() {
    log('---Deployment of SubStaking---');

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (common.getSubStakingAddress() && !process.env.ENFORCE_STACKING_DEPLOY)
        throw new Error('SubStaking already deployed. aborting.');

    log('Deploying SubStaking...');
    const SubStaking = await hardhat.ethers.getContractFactory('SubStaking');
    const subStaking = await upgrades.deployProxy(
        SubStaking,
        [BBS_TOKEN_ADDRESS, config.subStaking.currentQuarter,
            hardhat.ethers.BigNumber.from(config.subStaking.nextQuarterStart)]);
    await subStaking.deployed();
    common.etherscanLogContract(subStaking.address, subStaking.deployTransaction.chainId);
    fs.writeFileSync(common.subStakingPath, subStaking.address);

    log('---Deployment of SubStaking Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
