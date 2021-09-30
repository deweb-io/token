const hardhat = require('hardhat');

const BBS_TOKEN_ADDRESS = process.env.BBS_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const BBS_TOKEN_HOLDER = process.env.BBS_TOKEN_HOLDER || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

let bbsToken = null;
let bridge = null;

async function main() {
    const Token = await ethers.getContractFactory('BBSToken');
    bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const Bridge = await ethers.getContractFactory('Bridge');
    bridge = Bridge.attach(BRIDGE_ADDRESS);

    console.log(`BBS locked in bridge (${bridge.address}) (wei): ${await bbsToken.balanceOf(bridge.address)}`);
    console.log(`BBS balance of ${BBS_TOKEN_HOLDER} (wei): ${await bbsToken.balanceOf(BBS_TOKEN_HOLDER)}`);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});