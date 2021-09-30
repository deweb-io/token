const fs = require('fs');
const hardhat = require('hardhat');
const bridgeConfig = require('./bridge_config.js');

const LOGFILE = __dirname + '/log.txt';

// BBS TOKEN
const BBS_TOKEN_ADDRESS = process.env.BBS_TOKEN_ADDRESS;

async function main() {
    log(`---Deplyoment time: ${new Date()}---`);
    let bbsTokenAddress;

    // BBS token deploy
    if (!BBS_TOKEN_ADDRESS) {
        log(`Deploying BBS token...`);
        const Token = await hardhat.ethers.getContractFactory('BBSToken');
        const token = await Token.deploy();
        log(`BBS token deployed at ${token.address}`);
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

    // Bridge deploy
    log(`Deploying Bridge...`);
    const Bridge = await hardhat.ethers.getContractFactory('Bridge');
    const bridge = await Bridge.deploy(
        bridgeConfig.maxLockLimit,
        bridgeConfig.maxReleaseLimit,
        bridgeConfig.minLimit,
        bridgeConfig.limitIncPerBlock,
        bridgeConfig.minRequiredReports,
        bridgeConfig.commissionAmount,
        bbsTokenAddress);
    log(`Bridge deployed at ${bridge.address}`);

    log(`Set Reporters...`);
    await bridge.setReporters(bridgeConfig.reporters.addresses, bridgeConfig.reporters.active);

    log(`---Deployment completed!---`);
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
