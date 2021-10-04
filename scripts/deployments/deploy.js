const fs = require('fs');
const hardhat = require('hardhat');
const config = require('./config.js');

const LOGFILE = `${__dirname}/log.txt`;
const ARTIFCATS_DIR = `${__dirname}/artifacts`;

if (!fs.existsSync(ARTIFCATS_DIR)){
    fs.mkdirSync(ARTIFCATS_DIR);
}

const BBS_TOKEN_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bbsToken.txt`, 'utf8').toString();

async function main() {
    log(`---Deplyoment | ${new Date()}---`);
    let bbsTokenAddress;

    // BBS token deploy
    if (!BBS_TOKEN_ADDRESS) {
        log(`Deploying BBS token...`);
        const Token = await hardhat.ethers.getContractFactory('BBSToken');
        const token = await Token.deploy();
        log(`BBS token deployed at ${token.address}`);
        fs.writeFileSync(`${ARTIFCATS_DIR}/bbsToken.txt`, token.address);
        bbsTokenAddress = token.address;
    } else {
        bbsTokenAddress = BBS_TOKEN_ADDRESS;
    }

    // Stacking deploy
    log(`Deploying Staking...`);
    const Staking = await hardhat.ethers.getContractFactory('Staking');
    const staking = await upgrades.deployProxy(Staking, [bbsTokenAddress]);
    await staking.deployed();
    log(`Staking deployed at ${staking.address}`);
    fs.writeFileSync(`${ARTIFCATS_DIR}/staking.txt`, staking.address);

    // Bridge deploy
    log(`Deploying Bridge...`);
    const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    const bridge = await Bridge.deploy(
        config.bridge.maxLockLimit,
        config.bridge.maxReleaseLimit,
        config.bridge.minLimit,
        config.bridge.limitIncPerBlock,
        config.bridge.minRequiredReports,
        config.bridge.commissionAmount,
        bbsTokenAddress);
    log(`Bridge deployed at ${bridge.address}`);
    fs.writeFileSync(`${ARTIFCATS_DIR}/bridge.txt`, bridge.address);

    log(`Set Reporters...`);
    await bridge.setReporters(config.bridge.reporters.addresses, config.bridge.reporters.active);

    log(`---Deployment Done | ${new Date()}---`);
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
