const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const {getSigner} = require('../utils/utils');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const MINT_ARTIFACT_FILE = 'mint_tx.txt';


async function main() {
    log(`---Mint BBS tokens---`);
    if (!BBS_TOKEN_ADDRESS)
        throw new Error("BBS token address is missing. aborting.");

    if (common.artifactExists(MINT_ARTIFACT_FILE))
        throw new Error("script already run. aborting.");

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const deployer = (await getSigner()).address;
    log(`Minting ${config.mint.totalSupply} tokens to ${deployer}`);

    const totalSupplyWei = hardhat.ethers.utils.parseEther(config.mint.totalSupply);
    const tx = await bbsToken.mint(deployer, totalSupplyWei);
    common.etherscanLogTx(tx.hash, tx.chainId);

    common.writeArtifact(MINT_ARTIFACT_FILE, JSON.stringify(tx));

    log(`---Mint BBS tokens Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
