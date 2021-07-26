const { ethers } = require('hardhat');


// Set this environment variables to use previously deployed contracts.
const BBS_TOKEN = '0x94F32CA9c737FFe1b9e040de4027BAB92eb1f85a';
const BANCOR_X = '0x9db840EfaA31Be39e46E9782566D8f20ACfFE9cb';

describe('Bridge', function() {
    let bbsToken;
    let bancorX;
    let signer;

    function printContractDetails(name, addrees) {
        console.log(`${name} is deployed at ${addrees}`);
    }

    function printContracts() {
        console.log('####### Contracts #######');
        printContractDetails('BancorX', bancorX && bancorX.address);
        printContractDetails('BBS token', bbsToken && bbsToken.address);
        console.log('#########################');
    }

    beforeEach(async function() {
        const Token = await ethers.getContractFactory('BBSToken');
        bbsToken = await Token.deploy();
        console.log(`BBS token deployed at ${bbsToken.address}`);

        const BancorX = await ethers.getContractFactory('BancorX');
        bancorX = await BancorX.deploy(
            '40000000000000000000000',
            '80000000000000000000000',
            '1000000000000000000',
            '500000000000000000000',
            1,
            '0x9eED1767B3c33D4A4fDB7c76070DE2dDfd37e808', // should be upgrader contract address
            bbsToken.address);

        console.log(`BancorX deployed at ${bancorX.address}`);

        // const REPORTER1_PRIVATE_KEY = '0xe427e1a30d344c90f0b3884df1e58273ee7b6084c055bcc84090e2915967d8c6';
        const reporterAddress = '0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177';
        await bancorX['setReporter(address,bool)'](reporterAddress, true);
        console.log(`set reporter on bancor x ${reporterAddress}`);

        signer = (await ethers.getSigners())[0];
        printContracts();
    });

    it('mint BBS and make x transfer', async function() {
        console.log('signer address', signer.address);

        const mintAmount = ethers.utils.parseEther('10');
        await bbsToken.mint(signer.address, mintAmount);
        console.log('BBS minted', mintAmount);

        const balance = (await bbsToken.balanceOf(signer.address));
        console.log('BBS balance', balance);

        const eosBlockchain = ethers.utils.formatBytes32String('eos'); 
        const eosAddress = ethers.utils.formatBytes32String('tomeraccount'); 
        const txId = Math.floor(Math.random() * (100000));

        const xtransferAmount = ethers.utils.parseEther('5');
        await bbsToken.connect(signer).approve(bancorX.address, xtransferAmount);
        const xTransfer = await bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, txId, {from: signer.address});
        console.log(xTransfer);
    });
});
