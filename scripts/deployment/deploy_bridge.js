const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();


async function main() {
    log('---Deployment of Bridge---');

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (common.getBridgeAddress() && !process.env.ENFORCE_BRIDGE_DEPLOY)
        throw new Error('Bridge already deployed. aborting.');

    log('Deploying Bridge...');
    const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    const bridge = await Bridge.deploy(
        hardhat.ethers.utils.parseEther(config.bridge.maxLockLimit),
        hardhat.ethers.utils.parseEther(config.bridge.maxReleaseLimit),
        hardhat.ethers.utils.parseEther(config.bridge.minLimit),
        hardhat.ethers.utils.parseEther(config.bridge.limitIncPerBlock),
        config.bridge.minRequiredReports,
        hardhat.ethers.utils.parseEther(config.bridge.commissionAmount),
        BBS_TOKEN_ADDRESS);
    common.etherscanLogContract(bridge.address, bridge.deployTransaction.chainId);
    fs.writeFileSync(common.bridgePath, bridge.address);

    log('---Deployment of Bridge Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
