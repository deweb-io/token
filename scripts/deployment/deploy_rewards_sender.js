const fs = require('fs');
const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const BRIDGE_ADDRESS = common.getBridgeAddress();

async function main() {
    log(`---Deployment of RewardsSender---`);

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (!BRIDGE_ADDRESS)
        throw new Error('Bridge address is missing. aborting.');

    log(`Deploying RewardsSender...`);
    const RewardsSender = await hardhat.ethers.getContractFactory('RewardsSender');
    const rewardsSender = await RewardsSender.deploy(BBS_TOKEN_ADDRESS, BRIDGE_ADDRESS);
    common.etherscanLogContract(rewardsSender.address, rewardsSender.deployTransaction.chainId);
    fs.writeFileSync(common.rewardsSenderPath, rewardsSender.address);

    log(`---Deployment of RewardsSender Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
