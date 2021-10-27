const common = require('../common/common.js');
const log = common.log;

const STACKING_ADDRESS = common.getStakingAddress();
const NEW_OWNER = process.env.NEW_OWNER;

async function main() {
    log(`---Transfer ownership---`);
    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting');
    if (!NEW_OWNER)
        throw new Error("New owner address is missing. aborting");

    await common.transferOwnership('Staking', STACKING_ADDRESS, NEW_OWNER);
    log(`---Transfer ownership Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});