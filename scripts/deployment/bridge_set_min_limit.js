const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BRIDGE_ADDRESS = common.getBridgeAddress();


async function main() {
    log('---Set min limit for bridge---');

    if (!BRIDGE_ADDRESS)
        throw new Error('Bridge address is missing. aborting.');

    const Bridge = await ethers.getContractFactory('Bridge');
    const bridge = Bridge.attach(BRIDGE_ADDRESS);

    log('Set min limit amount...');
    const tx = await bridge.setMinLimit(ethers.utils.parseEther(config.bridge.minLimit));
    common.etherscanLogTx(tx.hash, tx.chainId);
    log('Set min limit Done');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
