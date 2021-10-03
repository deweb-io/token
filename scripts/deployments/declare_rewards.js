
const hardhat = require('hardhat');
const config = require('./config.js');

const BBS_TOKEN_ADDRESS = process.env.BBS_TOKEN_ADDRESS || "";
const STACKING_ADDRESS = process.env.STACKING_ADDRESS || "";

async function main() {
    if (!BBS_TOKEN_ADDRESS) {
        throw new Error("No BBS token address configured. aborting");
    }

    if (!STACKING_ADDRESS) {
        throw new Error("No Stacking address configured. aborting");
    }

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Staking = await ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    // approve
    const numberOfQuarters = config.rewards.quartes.length;
    const rewardAmountWei = hardhat.ethers.BigNumber.from(hardhat.ethers.utils.parseEther(config.rewards.amount));
    const totalApproveAmountWei = rewardAmountWei.mul(numberOfQuarters);
    await bbsToken.approve(STACKING_ADDRESS, totalApproveAmountWei);

    // declare rewards
    await Promise.all(config.rewards.quartes.map(quarterIndex => staking.declareReward(quarterIndex, rewardAmountWei)))
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});