const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');

const LOGFILE = `${__dirname}/log.txt`;
const ARTIFCATS_DIR = `${__dirname}/artifacts`;
const BBS_TOKEN_PATH = `${__dirname}/artifacts/bbsToken.txt`;

if (!fs.existsSync(ARTIFCATS_DIR)){
    fs.mkdirSync(ARTIFCATS_DIR);
}

const BBS_TOKEN_ADDRESS = fs.existsSync(BBS_TOKEN_PATH) ? fs.readFileSync(BBS_TOKEN_PATH, 'utf8').toString() : null;

async function main() {
    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    log(`---Deplyoment of Bridge | ${new Date()}---`);
    log(`Deploying Bridge...`);
    const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    const bridge = await Bridge.deploy(
        config.bridge.maxLockLimit,
        config.bridge.maxReleaseLimit,
        config.bridge.minLimit,
        config.bridge.limitIncPerBlock,
        config.bridge.minRequiredReports,
        config.bridge.commissionAmount,
        BBS_TOKEN_ADDRESS);
    log(`Bridge deployed at ${bridge.address}`);
    fs.writeFileSync(`${ARTIFCATS_DIR}/bridge.txt`, bridge.address);

    log(`Set Reporters...`);
    await bridge.setReporters(config.bridge.reporters.addresses, config.bridge.reporters.active);
    log(`Set Reporters Done`);

    log(`---Deployment of Bridge Done | ${new Date()}---`);
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
