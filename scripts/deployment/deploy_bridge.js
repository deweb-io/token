const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();


async function main() {
    log(`---Deployment of Bridge---`);

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (common.getBridgeAddress() && !process.env.ENFORCE_BRIDGE_DEPLOY)
        throw new Error('Bridge already deployed. aborting.');

    log(`Deploying Bridge...`);
    const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    const bridge = await Bridge.deploy(
        config.bridge.maxLockLimit,
        config.bridge.maxReleaseLimit,
        config.bridge.minLimit,
        config.bridge.limitIncPerBlock,
        config.bridge.minRequiredReports,
        config.bridge.commissionAmount,
        config.bridge.sendRewardsMaxLockLimit,
        ethers.utils.formatBytes32String(config.bridge.sendRewardsToAccount),
        BBS_TOKEN_ADDRESS);
    common.etherscanLogContract(bridge.address, bridge.deployTransaction.chainId);
    fs.writeFileSync(common.bridgePath, bridge.address);

    log(`---Deployment of Bridge Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
