const common = require('../common/common.js');
const log = common.log;

const DAILY_REWARDS_ADDRESS = common.getDailyRewardsAddress();
const ARTIFACT_FILE = `dailyRewards_set_tx.txt`;

async function main() {
    log(`---Set rewards---`);
    if (!DAILY_REWARDS_ADDRESS)
        throw new Error('DailyRewards address is missing. aborting.');

    const DailyRewards = await ethers.getContractFactory('DailyRewards');
    const dailyRewards = DailyRewards.attach(DAILY_REWARDS_ADDRESS);

    const tx = await dailyRewards.setRewards();
    common.etherscanLogTx(tx.hash, tx.chainId);
    common.writeArtifact(ARTIFACT_FILE, JSON.stringify(tx));
    log(`---Set rewards Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});