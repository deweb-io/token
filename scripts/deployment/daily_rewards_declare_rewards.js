const common = require('../common/common.js');
const config = require('./config.js');
const log = common.log;

const DAILY_REWARDS_ADDRESS = common.getDailyRewardsAddress();
const REWARDS_SENDER_ADDRESS = common.getRewardsSenderAddress();

const ARTIFACT_FILE = 'dailyRewards_declare_tx.txt';

async function main() {
    log('---Declare rewards---');
    if (!DAILY_REWARDS_ADDRESS)
        throw new Error('DailyRewards address is missing. aborting.');

    if (!REWARDS_SENDER_ADDRESS)
        throw new Error('Bridge address is missing. aborting.');

    const DailyRewards = await ethers.getContractFactory('DailyRewards');
    const dailyRewards = DailyRewards.attach(DAILY_REWARDS_ADDRESS);

    const tx = await dailyRewards.declareRewards([REWARDS_SENDER_ADDRESS], [ethers.utils.parseEther(config.dailyRewards.amount)]);
    common.etherscanLogTx(tx.hash, tx.chainId);
    common.writeArtifact(ARTIFACT_FILE, JSON.stringify(tx));
    log('---Declare rewards Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
