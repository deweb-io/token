const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;

const STACKING_ADDRESS = common.getStakingAddress();
const PRECISION = [ethers.BigNumber.from('100000000000000'), 10000];
const humanize = bigNumber => bigNumber.div(PRECISION[0]).toNumber() / PRECISION[1];

async function main() {
    log('---Calculating Staking Stats---');
    const stakes = {};
    for(const event of await (
        await hardhat.ethers.getContractFactory('StakingUpgrade1')
    ).attach(STACKING_ADDRESS).queryFilter('StakeLocked')){
        // It's okay to ignore an existing value for an updated one.
        stakes[`${event.args.staker} - ${event.args.stakeIdx}`] = {
            amount: humanize(event.args.amount),
            unlockQuarter: event.args.unlockQuarter
        };
    }

    // Output a nice CSV.
    for(const key of Object.keys(stakes)){
        log(`${key}, ${stakes[key].amount}, ${stakes[key].unlockQuarter}`);
    }

    log('---Staking Stats Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
