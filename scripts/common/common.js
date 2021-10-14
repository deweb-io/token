const fs = require('fs');

const LOGFILE = `${__dirname}/log.txt`;
const ARTIFCATS_DIR = `${__dirname}/artifacts`;
const BBS_TOKEN_PATH = `${ARTIFCATS_DIR}/bbsToken.txt`;
const BRIDGE_PATH = `${ARTIFCATS_DIR}/bridge.txt`;
const STAKING_PATH = `${ARTIFCATS_DIR}/staking.txt`;

function getAddress(path) {
    return fs.existsSync(path) ? fs.readFileSync(path, 'utf8').toString() : null;
}

module.exports = {
    artifactsDir: ARTIFCATS_DIR,
    bbsTokenPath: BBS_TOKEN_PATH,
    bridgePath: BRIDGE_PATH,
    stakingPath: STAKING_PATH,

    log: function (data) {
        console.log(data);
        fs.appendFileSync(LOGFILE, `${new Date()} | ` + data + '\n');
    },

    onError: function(err) {
        console.error(err);
        fs.appendFileSync(LOGFILE, `${new Date()} | ` + err + '\n');
        process.exit(1);
    },

    getBBStokenAddress : function () {
        return getAddress(BBS_TOKEN_PATH);
    },

    getStakingAddress : function () {
        return getAddress(STAKING_PATH);
    },

    getBridgeAddress : function () {
        return getAddress(BRIDGE_PATH);
    }
}