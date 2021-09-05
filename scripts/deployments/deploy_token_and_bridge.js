const hardhat = require('hardhat');

const maxLockLimit = process.env.ETHEREUM_BRIDGE_MAX_LOCK_LIMIT || '40000000000000000000000';
const maxReleaseLimit = process.env.ETHEREUM_BRIDGE_MAX_RELEASE_LIMIT || '80000000000000000000000';
const minLimit = process.env.ETHEREUM_BRIDGE_MIN_LIMIT || '1000000000000000000';
const limitIncPerBlock = process.env.ETHEREUM_BRIDGE_LIMIT_INC_PER_BLOCK || '500000000000000000000';
const minRequiredReports = process.env.ETHEREUM_BRIDGE_MIN_REQUIRED_REPORTS || 1;
const commissionAmount = process.env.ETHEREUM_BRIDGE_COMMISSION_AMOUNT || '12000000000000000000';
const minWithdrawAmount = process.env.ETHEREUM_MIN_WITHDRAW_AMOUNT || 0;
const reporterAddress = process.env.ETHEREUM_BRIDGE_REPORTER_ADDRESS || '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'

// Ropsten addresses
// '0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177';
// const REPORTER1_PRIVATE_KEY = '0xe427e1a30d344c90f0b3884df1e58273ee7b6084c055bcc84090e2915967d8c6';


async function main() {
    const owner = (await hardhat.ethers.getSigners())[0];
    console.log('owner', owner.address);

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const token = await Token.deploy();
    console.log(`BBS token deployed at ${token.address}`);

    const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    const bridge = await Bridge.deploy(
        maxLockLimit,
        maxReleaseLimit,
        minLimit,
        limitIncPerBlock,
        minRequiredReports,
        commissionAmount,
        minWithdrawAmount,
        token.address);

    console.log(`Bridge deployed at ${bridge.address}`);

    await bridge['setReporter(address,bool)'](reporterAddress, true);
    console.log(`set reporter on ethereum bridge ${reporterAddress}`);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
