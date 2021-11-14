const fs = require('fs');
const hardhat = require('hardhat');
const common = require('../common/common.js');
const log = common.log;

const BBS_TOKEN_ADDRESS = process.env.BBS_TOKEN_ADDRESS || common.getBBStokenAddress();
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS || common.getBridgeAddress();
const STAKING_ADDRESS = process.env.STAKING_ADDRESS || common.getStakingAddress();

async function main() {
    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    log('---BBS balances---');
    const bbsTokenHolder = process.env.BBS_TOKEN_HOLDER || (await hardhat.ethers.getSigners())[0].address;
    log(`BBS balance of ${bbsTokenHolder} (wei): ${await bbsToken.balanceOf(bbsTokenHolder)}`);

    if (BRIDGE_ADDRESS)
        log(`BBS locked in bridge ${BRIDGE_ADDRESS} (wei): ${await bbsToken.balanceOf(BRIDGE_ADDRESS)}`);

    if (STAKING_ADDRESS)
        log(`BBS locked in staking ${STAKING_ADDRESS} (wei): ${await bbsToken.balanceOf(STAKING_ADDRESS)}`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});