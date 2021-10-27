const common = require('../common/common.js');
const log = common.log;

const BRIDGE_ADDRESS = common.getBridgeAddress();
const NEW_OWNER = process.env.NEW_OWNER;

async function main() {
    log(`---Transfer ownership---`);
    if (!BRIDGE_ADDRESS)
        throw new Error('No Bridge address is missing. aborting');
    if (!NEW_OWNER)
        throw new Error("New owner address is missing. aborting");

    await common.transferOwnership('Bridge', BRIDGE_ADDRESS, NEW_OWNER);
    log(`---Transfer ownership Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});