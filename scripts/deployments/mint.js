const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();

async function mint(to, amount, bbsToken) {
    log(`Minting ${amount} undividable units to ${to}`);
    await bbsToken.mint(to, amount);
}

async function main() {
    log(`---Mint BBS tokens---`);
    if (!BBS_TOKEN_ADDRESS)
        throw new Error("BBS token address is missing. aborting.");

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);
    const bbsTokenTotalSupply = await bbsToken.totalSupply();

    const day1AmountWei = hardhat.ethers.utils.parseEther(config.mint.day1.amount);
    const day3AmountWei = hardhat.ethers.utils.parseEther(config.mint.day3.amount);
    const totalSupplyWei = hardhat.ethers.utils.parseEther(config.mint.totalSupply);

    if (bbsTokenTotalSupply.eq(0))
        await mint(config.mint.day1.to, day1AmountWei, bbsToken);
    else if (bbsTokenTotalSupply.eq(day1AmountWei))
        await mint(config.mint.day3.to, day3AmountWei, bbsToken);
    else if (bbsTokenTotalSupply.eq(day1AmountWei.add(day3AmountWei)))
        await mint(config.mint.safeAddress, totalSupplyWei.sub(day1AmountWei.add(day3AmountWei)), bbsToken);
    else if (bbsTokenTotalSupply.eq(totalSupplyWei)) {
        log(`Total supply is already ${config.mint.totalSupply}. aborting.`);
    } else {
       throw new error(`Total supply is unexpected: ${config.mint.totalSupply}`);
    }

    log(`---Mint BBS tokens Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});