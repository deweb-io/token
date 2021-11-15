const { exec } = require('child_process');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const BRIDGE_ADDRESS = common.getBridgeAddress();


log(`---Verify BRIDGE contract---`);
exec(`npx hardhat verify --network ${config.network} ${BRIDGE_ADDRESS} '${config.bridge.maxLockLimit}' '${config.bridge.maxReleaseLimit}' '${config.bridge.minLimit}' '${config.bridge.limitIncPerBlock}' ${config.bridge.minRequiredReports} ${config.bridge.commissionAmount} ${BBS_TOKEN_ADDRESS}`, (error, stdout, stderr) => {
    if (error) {
        log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        log(`stderr: ${stderr}`);
        return;
    }
    log(`stdout: ${stdout}`);
    log(`---Verify BRIDGE contract Done---`);
});

