const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BRIDGE_ADDRESS = common.getBridgeAddress();


async function main() {
    log('---Set reporters for bridge---');

    if (!BRIDGE_ADDRESS)
        throw new Error('Bridge address is missing. aborting.');

    const Bridge = await ethers.getContractFactory('Bridge');
    const bridge = Bridge.attach(BRIDGE_ADDRESS);

    log('Set comission amount...');
    const tx = await bridge.setCommissionAmount(ethers.utils.parseEther(config.bridge.commissionAmount));
    common.etherscanLogTx(tx.hash, tx.chainId);
    log('Set comission amount Done');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
