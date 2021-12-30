/**
 * This script requires cross-chain service to run and be configured with bridge and bbs token addreses on db.
 */
const hardhat = require('hardhat');
const config = require('../deployment/config.js');
const common = require('../common/common.js');

const { getSigner } = require('../utils/utils');

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const BRIDGE_ADDRESS = common.getBridgeAddress();

async function main() {
    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token is missing. aborting');

    if (!BRIDGE_ADDRESS)
        throw new Error('bridge address is missing. aborting.');

    const sender = (await getSigner()).address;
    const rewardsAmount = hardhat.ethers.utils.parseEther(config.dailyRewards.amount);

    console.log(`send rewards from ${sender}`);
    console.log(`rewards amount: ${rewardsAmount.toString()}`);

    const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    const bridge = Bridge.attach(BRIDGE_ADDRESS);

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    await bbsToken.approve(bridge.address, rewardsAmount);

    while ((await bbsToken.allowance(sender, bridge.address)) < rewardsAmount){
        console.log('waiting for approval');
    }

    await bridge.sendRewards(rewardsAmount);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
