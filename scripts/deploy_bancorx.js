const hardhat = require('hardhat');
async function main() {
    const owner = (await hardhat.ethers.getSigners())[0];
    console.log('owner', owner.address);

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const token = await Token.deploy();
    console.log(`BBS token deployed at ${token.address}`);

    const BancorX = await hardhat.ethers.getContractFactory('BancorX');
    const bancorx = await BancorX.deploy(
        '40000000000000000000000',
        '80000000000000000000000',
        '1000000000000000000',
        '500000000000000000000',
        1,
        '0x9eED1767B3c33D4A4fDB7c76070DE2dDfd37e808',
        token.address);

    console.log(`BancorX deployed at ${bancorx.address}`);

    // const REPORTER1_PRIVATE_KEY = '0xe427e1a30d344c90f0b3884df1e58273ee7b6084c055bcc84090e2915967d8c6';
    const reporterAddress = '0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177';
    await bancorx['setReporter(address,bool)'](reporterAddress, true);
    

}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
