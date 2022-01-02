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

    const sendRewardsData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'uint256'],
        [hardhat.ethers.utils.formatBytes32String(config.bridge.sendRewards.toBlockchain),
            hardhat.ethers.utils.formatBytes32String(config.bridge.sendRewards.toAccount),
            hardhat.ethers.utils.parseEther(config.bridge.sendRewards.maxLockLimit)]
    );

    log('Deploying Bridge...');
    const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    const bridge = await Bridge.deploy(
        hardhat.ethers.utils.parseEther(config.bridge.maxLockLimit),
        hardhat.ethers.utils.parseEther(config.bridge.maxReleaseLimit),
        hardhat.ethers.utils.parseEther(config.bridge.minLimit),
        hardhat.ethers.utils.parseEther(config.bridge.limitIncPerBlock),
        config.bridge.minRequiredReports,
        hardhat.ethers.utils.parseEther(config.bridge.commissionAmount),
        sendRewardsData,
        BBS_TOKEN_ADDRESS);
    common.etherscanLogContract(bridge.address, bridge.deployTransaction.chainId);
    fs.writeFileSync(common.bridgePath, bridge.address);
    fs.writeFileSync(common.bridgeSendRewardsArgPath, sendRewardsData);

    log('---Deployment of Bridge Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
