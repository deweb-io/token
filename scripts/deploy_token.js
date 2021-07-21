const hardhat = require('hardhat');
async function main() {
    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const token = await Token.deploy();
    console.log(`token deployed at ${token.address}`);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
