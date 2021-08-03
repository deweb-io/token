const hardhat = require('hardhat');

const maxLockLimit = process.env.ETHEREUM_BANCORX_MAX_LOCK_LIMIT || '40000000000000000000000';
const maxReleaseLimit = process.env.ETHEREUM_BANCORX_MAX_RELEASE_LIMIT || '80000000000000000000000';
const minLimit = process.env.ETHEREUM_BANCORX_MIN_LIMIT || '1000000000000000000';
const limitIncPerBlock = process.env.ETHEREUM_BANCORX_LIMIT_INC_PER_BLOCK || '500000000000000000000';
const minRequiredReports = process.env.ETHEREUM_BANCORX_MIN_REQUIRED_REPORTS || 1;
const commission = process.env.ETHEREUM_BANCORX_COMMISSION | '12000000000000000000';
const reporterAddress = process.env.ETHEREUM_BANCORX_REPORTER_ADDRESS || '0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177';
// const REPORTER1_PRIVATE_KEY = '0xe427e1a30d344c90f0b3884df1e58273ee7b6084c055bcc84090e2915967d8c6';


async function main() {
    const owner = (await hardhat.ethers.getSigners())[0];
    console.log('owner', owner.address);

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const token = await Token.deploy();
    console.log(`BBS token deployed at ${token.address}`);

    const BancorX = await hardhat.ethers.getContractFactory('BancorX');
    const bancorx = await BancorX.deploy(
        maxLockLimit,
        maxReleaseLimit,
        minLimit,
        limitIncPerBlock,
        minRequiredReports,
        commission,
        token.address);

    console.log(`BancorX deployed at ${bancorx.address}`);

    await bancorx['setReporter(address,bool)'](reporterAddress, true);
    console.log(`set reporter on bancor x ${reporterAddress}`);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
