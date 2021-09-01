const hardhat = require('hardhat');

const maxLockLimit = process.env.ETHEREUM_BRIDGE_MAX_LOCK_LIMIT || '40000000000000000000000';
const maxReleaseLimit = process.env.ETHEREUM_BRIDGE_MAX_RELEASE_LIMIT || '80000000000000000000000';
const minLimit = process.env.ETHEREUM_BRIDGE_MIN_LIMIT || '1000000000000000000';
const limitIncPerBlock = process.env.ETHEREUM_BRIDGE_LIMIT_INC_PER_BLOCK || '500000000000000000000';
const minRequiredReports = process.env.ETHEREUM_BRIDGE_MIN_REQUIRED_REPORTS || 1;
const commissionAmount = process.env.ETHEREUM_BRIDGE_COMMISSION_AMOUNT | '12000000000000000000';
const reporterAddress = process.env.ETHEREUM_BRIDGE_REPORTER_ADDRESS || '0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177';

let BBS_TOKEN_ADDRESS = '0x94F32CA9c737FFe1b9e040de4027BAB92eb1f85a';
let bbsToken = null;

const CHAIN_IDS = {
    MAINNET : '1',
    ROPSTEN : '3',
};

async function signPremitData(signer, spender, value, nonce, deadline) {
    const signature = await signer._signTypedData(
        {name: bbs.tokenName(), version: '1', chainId: CHAIN_IDS.ROPSTEN, verifyingContract: bbsToken.address},
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

/**
    * Used in tests where we do not test the xTransfer itself.
    * @param {} amount
    * @param {*} transmitter
    */
async function xTransfer(amount, transmitter) {
    const nonce = await getNonce(tokenOwner);
    const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, amount, nonce);

    await bridge.connect(transmitter).xTransfer(
        eosBlockchain, eosAddress, amount, deadline, tokenOwner.address, v, r, s);
}

async function main() {
    const owner = (await hardhat.ethers.getSigners())[0];
    console.log('owner', owner.address);

    deadline = 'GET TIMESTAMP OF LAST BLOCK + 10000000000';


    // BBS existing
    const Token = await ethers.getContractFactory('BBSToken');
    bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    // const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    // const bridge = await Bridge.deploy(
    //     maxLockLimit,
    //     maxReleaseLimit,
    //     minLimit,
    //     limitIncPerBlock,
    //     minRequiredReports,
    //     commissionAmount,
    //     '0x94F32CA9c737FFe1b9e040de4027BAB92eb1f85a');

    // console.log(`Bridge deployed at ${bridge.address}`);

    // await bridge['setReporter(address,bool)'](reporterAddress, true);
    // console.log(`set reporter on ethereum bridge ${reporterAddress}`);

    const tokenOwner = owner;
    const tokenSpender = bridge.address;
    const xTransferAmount = ethers.utils.parseEther('1.0');
    const nonce = await getNonce(tokenOwner);

    const eosBlockchain = ethers.utils.formatBytes32String('eos'); //Not sure about that.
    const eosAddress = ethers.utils.formatBytes32String('tomerbridge1');

    const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, xTransferAmount, nonce);

    // xTransfer
    await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferAmount, deadline, tokenOwner.address, v, r, s);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
