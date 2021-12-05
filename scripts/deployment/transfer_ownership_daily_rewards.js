const config = require('./config.js');
const common = require('../common/common.js');
const log = common.log;

const DAILY_REWARDS_ADDRESS = common.getDailyRewardsAddress();


async function main() {
    log(`---Transfer ownership---`);
    await common.transferOwnership('DailyRewards', DAILY_REWARDS_ADDRESS, config.safe.address);
    log(`---Transfer ownership Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});