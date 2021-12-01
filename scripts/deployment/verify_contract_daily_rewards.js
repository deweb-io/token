const { exec } = require('child_process');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const DAILY_REWARDS_ADDRESS = common.getDailyRewardsAddress();


log(`---Verify DailyRewards contract---`);
exec(`npx hardhat verify --network ${config.network} ${DAILY_REWARDS_ADDRESS} ${BBS_TOKEN_ADDRESS}`, (error, stdout, stderr) => {
    if (error) {
        log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        log(`stderr: ${stderr}`);
        return;
    }
    log(`stdout: ${stdout}`);
    log(`---Verify DailyRewards contract Done---`);
});

