const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();


async function main() {
    log(`---Mint BBS tokens---`);
    if (!BBS_TOKEN_ADDRESS)
        throw new Error("BBS token address is missing. aborting");

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);
    const amountWei = hardhat.ethers.utils.parseEther(config.mint.amount);

    const bbsTokenTotalSupply = await bbsToken.totalSupply();
    if (amountWei.eq(bbsTokenTotalSupply)) {
        log(`BBS token supply is ${bbsTokenTotalSupply}. tokens were already minted. aborting.`);
        return;
    }

    log(`Minting ${config.mint.amount} tokens...`);
    await bbsToken.mint(config.mint.to, amountWei);

    log(`---Mint BBS tokens Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});