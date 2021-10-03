const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');

const BBS_TOKEN_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bbsToken.txt`, 'utf8').toString();


async function main() {
    if (!BBS_TOKEN_ADDRESS) {
        throw new Error("BBS token address is missing. aborting");
    }

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);
    const amountWei = hardhat.ethers.utils.parseEther(config.mint.amount);

    await bbsToken.mint(config.mint.to, amountWei);
}


main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});