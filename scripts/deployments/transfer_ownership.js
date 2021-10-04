const fs = require('fs');
const hardhat = require('hardhat');

const LOGFILE = `${__dirname}/log.txt`;
const BBS_TOKEN_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bbsToken.txt`, 'utf8').toString();
const STACKING_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/staking.txt`, 'utf8').toString();
const NEW_OWNER = process.env.NEW_OWNER;

async function main() {
    log(`---Transfer ownership | ${new Date()}---`);
    if (!BBS_TOKEN_ADDRESS)
        throw new Error("BBS token address is missing. aborting");

    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting');

    if (!NEW_OWNER)
        throw new Error("new owner address is missing. aborting");

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Staking = await ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    log(`Transfering ownership of BBS token to ${NEW_OWNER}`);
    await bbsToken.transferOwnership(NEW_OWNER)
    log(`Transfering ownership of Stacking to ${NEW_OWNER}`);
    await staking.transferOwnership(STACKING_ADDRESS);

    log(`---Transfer ownership Done | ${new Date()}---`);
}

function log(data) {
    console.log(data);
    fs.appendFileSync(LOGFILE, data + '\n');
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});