const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');

const LOGFILE = `${__dirname}/log.txt`;
const BBS_TOKEN_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bbsToken.txt`, 'utf8').toString();


async function main() {
    log(`---Mint BBS tokens | ${new Date()}---`);
    if (!BBS_TOKEN_ADDRESS)
        throw new Error("BBS token address is missing. aborting");

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);
    const amountWei = hardhat.ethers.utils.parseEther(config.mint.amount);

    const bbsTokenTotalSupply = await bbsToken.totalSupply();
    if (amountWei.eq(bbsTokenTotalSupply)) {
        log(`BBS token supply is ${bbsTokenTotalSupply}. tokens werte already minted. aborting.`);
        return;
    }

    log(`---Minting ${config.mint.amount} tokens... | ${new Date()}---`);
    await bbsToken.mint(config.mint.to, amountWei);

    log(`---Mint BBS tokens Done | ${new Date()}---`);
}

function log(data) {
    console.log(data);
    fs.appendFileSync(LOGFILE, data + '\n');
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    log(error);
    process.exit(1);
});