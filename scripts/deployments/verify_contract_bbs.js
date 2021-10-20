const { exec } = require('child_process');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();

log(`---Verify BBS contract---`);
exec(`npx hardhat verify --network ${config.network} ${BBS_TOKEN_ADDRESS}`, (error, stdout, stderr) => {
    if (error) {
        log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        log(`stderr: ${stderr}`);
        return;
    }
    log(`stdout: ${stdout}`);
    log(`---Verify BBS contract Done---`);
});

