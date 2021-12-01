const { exec } = require('child_process');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const BRIDGE_ADDRESS = common.getBridgeAddress();
const REWARDS_SENDER_ADDRESS = common.getRewardsSenderAddress();

log(`---Verify RewardsSenser contract---`);
exec(`npx hardhat verify --network ${config.network} ${REWARDS_SENDER_ADDRESS} ${BBS_TOKEN_ADDRESS} ${BRIDGE_ADDRESS}`, (error, stdout, stderr) => {
    if (error) {
        log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        log(`stderr: ${stderr}`);
        return;
    }
    log(`stdout: ${stdout}`);
    log(`---Verify RewardsSenser contract Done---`);
});

