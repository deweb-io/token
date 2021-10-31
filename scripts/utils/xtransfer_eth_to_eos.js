const hardhat = require('hardhat');
const common = require('../common/common.js');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const BRIDGE_ADDRESS = common.getBridgeAddress();
const RECEIVER_EOS_ACCOUNT = process.env.RECEIVER_EOS_ACCOUNT;
const BBS_AMOUNT = `${process.env.BBS_AMOUNT}`;

let bbsToken;
let bridge;
let networkChainId;

async function signPremitData(signer, spender, value, nonce, deadline) {
    const signature = await signer._signTypedData(
        {name: 'BBS', version: '1', chainId: networkChainId, verifyingContract: bbsToken.address},
        {Permit: [
            {name: 'owner', type: 'address'}, {name: 'spender', type: 'address'},
            {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'},
            {name: 'deadline', type: 'uint256'}
        ]},
        {owner: signer.address, spender, value, nonce, deadline});
    return ethers.utils.splitSignature(signature);
}

async function getNonce(account) {
    return (await bbsToken.nonces(account.address)).toNumber();
}

async function main() {
    const provider = await (ethers.getDefaultProvider(hardhat.network.config.url));
    const deadline = (await provider.getBlock(await provider.getBlockNumber())).timestamp + 10000000000;
    networkChainId = (await provider.getNetwork()).chainId;

    const Token = await ethers.getContractFactory('BBSToken');
    bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Bridge = await ethers.getContractFactory('Bridge');
    bridge = Bridge.attach(BRIDGE_ADDRESS);
    log(`xTransfersEnabled: ${await bridge.xTransfersEnabled()}`);

    const tokenOwner = (await hardhat.ethers.getSigners())[0];
    const tokenSpender = bridge.address;
    const xTransferAmount = ethers.utils.parseEther(BBS_AMOUNT);
    const nonce = await getNonce(tokenOwner);
    const id = 0;

    // EOS data
    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String(RECEIVER_EOS_ACCOUNT);

    log(`BBS locked in bridge (wei): ${await bbsToken.balanceOf(bridge.address)}`);
    log(`BBS balance of token owner (wei): ${await bbsToken.balanceOf(tokenOwner.address)}`);

    const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, xTransferAmount, nonce, deadline);

    // xTransfer
    console.log(`xTransfer ${BBS_AMOUNT} from ${tokenOwner.address} to ${RECEIVER_EOS_ACCOUNT}...`);
    const tx = await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferAmount, deadline, tokenOwner.address, v, r, s, id);

    log(JSON.stringify(tx));
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
