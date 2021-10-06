const fs = require('fs');
const { exec } = require("child_process");
const config = require('./config.js');
const { network } = require("./config.js");

const LOGFILE = `${__dirname}/log.txt`;
const BBS_TOKEN_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/bbsToken.txt`, 'utf8').toString();
const STACKING_ADDRESS = fs.readFileSync(`${__dirname}/artifacts/staking.txt`, 'utf8').toString();
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


/**
    This will throw an error: Error in plugin @nomiclabs/hardhat-etherscan: The contract you want to verify was compiled with solidity 0.8.2, but your configured compiler version is: 0.8.6.
    But this is ok since we are going to verify the imp contract manually on etherscan, and this used to only verify the proxy contract.
 */
log(`---Verify Stacking contract | ${new Date()}---`);
exec(`npx hardhat verify --network ${network} ${STACKING_ADDRESS}`, (error, stdout, stderr) => {
    if (error) {
        log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        log(`stderr: ${stderr}`);
        return;
    }
    log(`stdout: ${stdout}`);
    log(`---Verify Stacking contract Done | ${new Date()}---`);
});
