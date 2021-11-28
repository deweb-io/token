const common = require('../common/common.js');
const log = common.log;

const REWARDS_SENDER_ADDRESS = common.getRewardsSenderAddress();

const ARTIFACT_FILE = `send_rewards_tx.txt`;

async function main() {
    log(`---send rewards---`);
    if (!REWARDS_SENDER_ADDRESS)
        throw new Error("rewards sender address is missing. aborting.");

    const RewardsSender = await ethers.getContractFactory('RewardsSender');
    const rewardsSender = RewardsSender.attach(REWARDS_SENDER_ADDRESS);

    const tx = await rewardsSender.sendRewards();
    common.etherscanLogTx(tx.hash, tx.chainId);
    common.writeArtifact(ARTIFACT_FILE, JSON.stringify(tx));
    log(`---Declare rewards Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});