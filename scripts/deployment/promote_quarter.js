const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;

const STACKING_ADDRESS = common.getStakingAddress();

async function main() {
    log('---Promote Quarter---');

    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting.');

    const Staking = await hardhat.ethers.getContractFactory('StakingUpgrade1');
    const staking = Staking.attach(STACKING_ADDRESS);

    const currentQuarter = await staking.currentQuarter();
    log(`current quarter is:${currentQuarter}`);

    const tx = await staking.promoteQuarter();
    common.etherscanLogTx(tx.hash, tx.chainId);

    log('---Promote Quarter Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
