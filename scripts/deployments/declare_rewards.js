const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const STACKING_ADDRESS = common.getStakingAddress();

async function main() {
    log(`---Declare rewards---`);
    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting.');

    const Staking = await hardhat.ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    const rewardAmountWei = hardhat.ethers.BigNumber.from(hardhat.ethers.utils.parseEther(config.rewards.amount));
    for (const quarterIndex of config.rewards.quartes) {
        const quarter = await staking.quarters(quarterIndex);
        const currentRewardWei = quarter.reward;

        if (currentRewardWei.gt(rewardAmountWei)) {
            log(`Quarter ${quarterIndex} already has a BIGGER reward (${currentRewardWei}) then configured ${rewardAmountWei}. skipping.`);
            continue;
        }

        if (currentRewardWei.eq(rewardAmountWei)) {
            log(`Quarter ${quarterIndex} already has a reward: ${currentRewardWei}. skipping.`);
            continue;
        }

        // calculate reward to be added to quarter
        const rewardToAddWei = rewardAmountWei.sub(currentRewardWei);
        log(`Decalring rewards for quarter ${quarterIndex}, amount (wei): ${rewardToAddWei}`);
        await staking.declareReward(quarterIndex, rewardToAddWei);
    }

    log(`---Declare rewards Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});