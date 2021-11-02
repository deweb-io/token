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
        BBS_TOKEN_ADDRESS);
    log(`Bridge deployed at ${bridge.address}`);
    fs.writeFileSync(common.bridgePath, bridge.address);

    log(`---Deployment of Bridge Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
