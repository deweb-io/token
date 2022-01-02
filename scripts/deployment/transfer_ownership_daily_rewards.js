const config = require('./config.js');
const common = require('../common/common.js');

const DAILY_REWARDS_ADDRESS = common.getDailyRewardsAddress();


async function main() {
    await common.transferOwnership('DailyRewards', DAILY_REWARDS_ADDRESS, config.safe.address);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
