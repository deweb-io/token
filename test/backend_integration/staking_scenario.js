const common = require('../../scripts/common/common');
const {range} = require('../utils');
const {
    initStaking,
    runScenario,
    getBBSTokenAddress,
    getStakingContractAddress} = require('../staking-utils');
const { network } = require('hardhat');

const {s3} = require('../scenarios');

async function main() {
    await initStaking();

    await runScenario(s3);

    // mine 12 blocks (todo: https://hardhat.org/hardhat-network/reference/#hardhat-mine)
    for (index=1; index<=12; index++)
        await network.provider.send('evm_mine');

    // print contracts addresses
    console.log('staking address', getStakingContractAddress());
    console.log('BBS token address', getBBSTokenAddress());
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
