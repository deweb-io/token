const fs = require('fs');
const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();


async function main() {
    log('---Deplyoment of BBS token---');

    if (!fs.existsSync(common.artifactsDir))
        fs.mkdirSync(common.artifactsDir);

    if (!BBS_TOKEN_ADDRESS) {
        log('Deploying BBS token...');
        const Token = await hardhat.ethers.getContractFactory('BBSToken');
        const token = await Token.deploy();
        common.etherscanLogContract(token.address, token.deployTransaction.chainId);
        fs.writeFileSync(common.bbsTokenPath, token.address);
    } else
        log(`BBS token already deployed at ${BBS_TOKEN_ADDRESS}`);

    log('---Deplyoment of BBS token Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
