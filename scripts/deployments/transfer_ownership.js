const hardhat = require('hardhat');
const common = require('../common/common.js');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const STACKING_ADDRESS = common.getStakingAddress();
const NEW_OWNER = process.env.NEW_OWNER;


async function main() {
    log(`---Transfer ownership---`);
    if (!BBS_TOKEN_ADDRESS)
        throw new Error("BBS token address is missing. aborting");

    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting');

    if (!NEW_OWNER)
        throw new Error("New owner address is missing. aborting");

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Staking = await ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    const currentOwnerBBSToken = await bbsToken.owner();
    if (currentOwnerBBSToken != NEW_OWNER) {
        log(`Transfering ownership of BBS token to ${NEW_OWNER}`);
        await bbsToken.transferOwnership(NEW_OWNER);
    } else {
        log(`BBS token owner is already ${NEW_OWNER}`);
    }

    const currentOwnerStaking = await staking.owner();
    if (currentOwnerStaking != NEW_OWNER) {
        log(`Transfering ownership of Stacking to ${NEW_OWNER}`);
        await staking.transferOwnership(STACKING_ADDRESS);
    } else {
        log(`Staking owner is already ${NEW_OWNER}`);
    }

    log(`---Transfer ownership Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});