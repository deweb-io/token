const fs = require('fs');
const hardhat = require('hardhat');
const common = require('../common/common.js');
const log = common.log;

const BBS_TOKEN_ADDRESS = process.env.BBS_TOKEN_ADDRESS || common.getBBStokenAddress();
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS || common.getBridgeAddress();
const STAKING_ADDRESS = process.env.STAKING_ADDRESS || common.getStakingAddress();
const BBS_TOKEN_HOLDER = process.env.BBS_TOKEN_HOLDER || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

let bbsToken = null;

async function main() {
    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    bbsToken = Token.attach(BBS_TOKEN_ADDRESS);
    log('---BBS balances---');
    log(`BBS balance of ${BBS_TOKEN_HOLDER} (wei): ${await bbsToken.balanceOf(BBS_TOKEN_HOLDER)}`);
    log(`BBS locked in bridge (${BRIDGE_ADDRESS}) (wei): ${await bbsToken.balanceOf(BRIDGE_ADDRESS)}`);
    log(`BBS locked in staking ${STAKING_ADDRESS} (wei): ${await bbsToken.balanceOf(STAKING_ADDRESS)}`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});