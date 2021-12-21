const config = require('./config.js');
const common = require('../common/common.js');
const log = common.log;

const STACKING_ADDRESS = common.getStakingAddress();


async function main() {
    await common.transferOwnership('Staking', STACKING_ADDRESS, config.safe.address);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
