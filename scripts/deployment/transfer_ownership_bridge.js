const common = require('../common/common.js');
const log = common.log;

const BRIDGE_ADDRESS = common.getBridgeAddress();

async function main() {
    log(`---Transfer ownership---`);
    await common.transferOwnership('Bridge', BRIDGE_ADDRESS, config.safe.address);
    log(`---Transfer ownership Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
