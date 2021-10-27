const common = require('../common/common.js');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const NEW_OWNER = process.env.NEW_OWNER;

async function main() {
    log(`---Transfer ownership---`);
    if (!BBS_TOKEN_ADDRESS)
        throw new Error("BBS token address is missing. aborting");
    if (!NEW_OWNER)
        throw new Error("New owner address is missing. aborting");

    await common.transferOwnership('BBSToken', BBS_TOKEN_ADDRESS, NEW_OWNER);
    log(`---Transfer ownership Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});