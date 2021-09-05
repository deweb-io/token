const hardhat = require('hardhat');

const BBS_TOKEN_ADDRESS = process.env.BBS_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const RECEIVER_EOS_ACCOUNT = process.env.RECEIVER_EOS_ACCOUNT || 'mjfmnnzvsuqr';
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
    const bbsOwner = (await hardhat.ethers.getSigners())[0]; // True for local network, need to be changed
    console.log(`bbsOwner: ${bbsOwner.address}`);

    const provider = await (ethers.getDefaultProvider(NODE_URL));
    const deadline = (await provider.getBlock(await provider.getBlockNumber())).timestamp + 10000000000;

    const Token = await ethers.getContractFactory('BBSToken');
    bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Bridge = await ethers.getContractFactory('Bridge');
    bridge = Bridge.attach(BRIDGE_ADDRESS);
    console.log(`xTransfersEnabled: ${await bridge.xTransfersEnabled()}`);

    // mint some tokens so we have what to transfer
    await bbsToken.connect(bbsOwner).mint(bbsOwner.address, 10);

    const tokenOwner = bbsOwner;
    const tokenSpender = bridge.address;
    const xTransferAmount = ethers.utils.parseEther('1.0');
    const nonce = await getNonce(tokenOwner);
    const id = 0;

    // EOS data
    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String(RECEIVER_EOS_ACCOUNT);

    console.log(`BBS locked in bridge: ${await bbsToken.balanceOf(bridge.address)}`);

    console.log(`BBS balance of token owner: ${await bbsToken.balanceOf(tokenOwner.address)}`);

    const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, xTransferAmount, nonce, deadline);

    // xTransfer
    await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferAmount, deadline, tokenOwner.address, v, r, s, id);

    console.log(`BBS locked in bridge: ${await bbsToken.balanceOf(bridge.address)}`);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
