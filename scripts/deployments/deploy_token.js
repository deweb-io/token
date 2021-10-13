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
    log(`---Deplyoment of BBS token| ${new Date()}---`);

    if (!BBS_TOKEN_ADDRESS) {
        log(`Deploying BBS token...`);
        const Token = await hardhat.ethers.getContractFactory('BBSToken');
        const token = await Token.deploy();
        log(`BBS token deployed at ${token.address}`);
        fs.writeFileSync(`${ARTIFCATS_DIR}/bbsToken.txt`, token.address);
    } else
        log(`BBS token already deployed at ${BBS_TOKEN_ADDRESS}`)

    log(`---Deplyoment of BBS token Done| ${new Date()}---`);
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
