const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');

const LOGFILE = `${__dirname}/log.txt`;
const ARTIFCATS_DIR = `${__dirname}/artifacts`;
const BBS_TOKEN_PATH = `${__dirname}/artifacts/bbsToken.txt`;

if (!fs.existsSync(ARTIFCATS_DIR))
    fs.mkdirSync(ARTIFCATS_DIR);

const BBS_TOKEN_ADDRESS = fs.existsSync(BBS_TOKEN_PATH) ? fs.readFileSync(BBS_TOKEN_PATH, 'utf8').toString() : null;

async function main() {
    log(`---Deplyoment of Staking | ${new Date()}---`);

    // BBS token deploy
    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    // Stacking deploy
    log(`Deploying Staking...`);
    const Staking = await hardhat.ethers.getContractFactory('Staking');
    const staking = await upgrades.deployProxy(Staking, [BBS_TOKEN_ADDRESS]);
    await staking.deployed();
    log(`Staking deployed at ${staking.address}`);
    fs.writeFileSync(`${ARTIFCATS_DIR}/staking.txt`, staking.address);

    log(`---Deployment of Staking Done | ${new Date()}---`);
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
