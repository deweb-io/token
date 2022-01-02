const config = require('./config.js');
const common = require('../common/common.js');

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();


async function main() {
    await common.transferOwnership('BBSToken', BBS_TOKEN_ADDRESS, config.safe.address);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
