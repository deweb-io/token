const hardhat = require('hardhat');
const common = require('../common/common.js');
const log = common.log;

const BBS_TOKEN_ADDRESS = process.env.BBS_TOKEN_ADDRESS || common.getBBStokenAddress();
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS || common.getBridgeAddress();
const RECEIVER_EOS_ACCOUNT = process.env.RECEIVER_EOS_ACCOUNT || 'rjyqmacwqxbc';
const NODE_URL = process.env.NODE_URL || 'http://localhost:8545';

let bbsToken = null;
let bridge = null;

const CHAIN_IDS = {
    MAINNET : '1',
    ROPSTEN : '3',
    HARDHAT : '1337'
};

async function signPremitData(signer, spender, value, nonce, deadline) {
    const signature = await signer._signTypedData(
        {name: 'BBS', version: '1', chainId: CHAIN_IDS.HARDHAT, verifyingContract: bbsToken.address},
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
    const bbsContractOwner = process.env.BBS_CONTRACT_OWNER || (await hardhat.ethers.getSigners())[0];
    const provider = await (ethers.getDefaultProvider(NODE_URL));
    const deadline = (await provider.getBlock(await provider.getBlockNumber())).timestamp + 10000000000;

    const Token = await ethers.getContractFactory('BBSToken');
    bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Bridge = await ethers.getContractFactory('Bridge');
    bridge = Bridge.attach(BRIDGE_ADDRESS);
    log(`xTransfersEnabled: ${await bridge.xTransfersEnabled()}`);

    const tokenOwner = process.env.BBS_TOKEN_OWNER || bbsContractOwner;
    const tokenSpender = bridge.address;
    const xTransferAmount = ethers.utils.parseEther('1');
    const nonce = await getNonce(tokenOwner);
    const id = 0;

    // mint some tokens so we have what to transfer (if balance is 0)
    const balance =  (await bbsToken.balanceOf(tokenOwner.address)).toString();
    if (balance === "0" )
        await bbsToken.connect(bbsContractOwner).mint(tokenOwner.address, xTransferAmount);

    // EOS data
    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String(RECEIVER_EOS_ACCOUNT);

    log(`BBS locked in bridge (wei): ${await bbsToken.balanceOf(bridge.address)}`);
    log(`BBS balance of token owner (wei): ${await bbsToken.balanceOf(tokenOwner.address)}`);

    const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, xTransferAmount, nonce, deadline);

    // xTransfer
    console.log(`xTransfer: from ${tokenOwner.address} to ${RECEIVER_EOS_ACCOUNT}`);
    await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferAmount, deadline, tokenOwner.address, v, r, s, id);

    log(`BBS locked in bridge (wei): ${await bbsToken.balanceOf(bridge.address)}`);
    log(`BBS balance of ${tokenOwner.address} (wei): ${await bbsToken.balanceOf(tokenOwner.address)}`);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
