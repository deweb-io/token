const fs = require('fs');
const { exec } = require("child_process");
const config = require('./config.js');
const { network } = require("./config.js");

const LOGFILE = `${__dirname}/log.txt`;
const BBS_TOKEN_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bbsToken.txt`, 'utf8').toString();
const BRIDGE_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bridge.txt`, 'utf8').toString();

function log(data) {
    console.log(data);
    fs.appendFileSync(LOGFILE, data + '\n');
}

log(`---Verify BBS contract | ${new Date()}---`);
exec(`npx hardhat verify --network ${network} ${BBS_TOKEN_ADDRESS}`, (error, stdout, stderr) => {
    if (error) {
        log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        log(`stderr: ${stderr}`);
        return;
    }
    log(`stdout: ${stdout}`);
    log(`---Verify BBS contract Done| ${new Date()}---`);
});

log(`---Verify BRIDGE contract | ${new Date()}---`);
exec(`npx hardhat verify --network ${network} ${BRIDGE_ADDRESS} '${config.bridge.maxLockLimit}' '${config.bridge.maxReleaseLimit}' '${config.bridge.minLimit}' '${config.bridge.limitIncPerBlock}' ${config.bridge.minRequiredReports} ${config.bridge.commissionAmount} ${BBS_TOKEN_ADDRESS}`, (error, stdout, stderr) => {
    if (error) {
        log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        log(`stderr: ${stderr}`);
        return;
    }
    log(`stdout: ${stdout}`);
    log(`---Verify BRIDGE contract Done | ${new Date()}---`);
});

