const hardhat = require('hardhat');
const common = require('../common/common.js');
const {signPermit, getSigner} = require('../utils/utils');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const BRIDGE_ADDRESS = common.getBridgeAddress();
const RECEIVER_EOS_ACCOUNT = process.env.RECEIVER_EOS_ACCOUNT;
const BBS_AMOUNT = `${process.env.BBS_AMOUNT}`;
const XTRANSFER_ARTIFACT_FILE = 'xTransfer_tx.txt';


async function main() {
    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (!BRIDGE_ADDRESS)
        throw new Error('Bridge address is missing. aborting.');

    if (common.artifactExists(XTRANSFER_ARTIFACT_FILE))
        throw new Error('script already run. aborting.');

    const provider = await (ethers.getDefaultProvider(hardhat.network.config.url));
    const deadline = (await provider.getBlock(await provider.getBlockNumber())).timestamp + 10000000000;

    const Token = await ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);
    const tokenName = await bbsToken.name();

    const Bridge = await ethers.getContractFactory('Bridge');
    const bridge = Bridge.attach(BRIDGE_ADDRESS);
    log(`xTransfersEnabled: ${await bridge.xTransfersEnabled()}`);
    log(`current lock limit: ${(await bridge.getCurrentLockLimit()).toString()}`);

    const tokenOwner = await getSigner();
    const tokenSpender = bridge.address;
    const xTransferAmount = ethers.utils.parseEther(BBS_AMOUNT);

    // EOS data
    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String(RECEIVER_EOS_ACCOUNT);

    log(`BBS locked in bridge (wei): ${await bbsToken.balanceOf(bridge.address)}`);
    log(`BBS balance of token owner (wei): ${await bbsToken.balanceOf(tokenOwner.address)}`);

    const {v, r, s} = await signPermit(tokenOwner, tokenSpender, xTransferAmount, deadline, bbsToken, tokenName);

    // xTransfer
    console.log(`xTransfer ${BBS_AMOUNT} from ${tokenOwner.address} to ${RECEIVER_EOS_ACCOUNT}...`);
    const tx = await bridge.connect(tokenOwner).xTransfer(
        eosBlockchain, eosAddress, xTransferAmount, deadline, tokenOwner.address, v, r, s);
    common.etherscanLogTx(tx.hash, tx.chainId);

    common.writeArtifact(XTRANSFER_ARTIFACT_FILE, JSON.stringify(tx));
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
