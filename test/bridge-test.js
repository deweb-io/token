const { ethers } = require('hardhat');


// Set this environment variables to use previously deployed contracts.
const BBS_TOKEN = '0x94F32CA9c737FFe1b9e040de4027BAB92eb1f85a';
const BANCOR_X = '0x9db840EfaA31Be39e46E9782566D8f20ACfFE9cb';

describe('Bridge', function() {
    let bbsToken;
    let bancorX;
    let accounts;
    let signer;
    let reporter;
    let xtransferAmount = ethers.utils.parseEther('5');

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
        accounts = await ethers.getSigners();
        signer = accounts[0];
        reporter = accounts[1];

        const Token = await ethers.getContractFactory('BBSToken');
        bbsToken = await Token.deploy();

        const BancorX = await ethers.getContractFactory('BancorX');
        bancorX = await BancorX.deploy(
            '40000000000000000000000',
            '80000000000000000000000',
            '1000000000000000000',
            '500000000000000000000',
            1,
            '0x9eED1767B3c33D4A4fDB7c76070DE2dDfd37e808', // should be upgrader contract address
            bbsToken.address);


        // const REPORTER1_PRIVATE_KEY = '0xe427e1a30d344c90f0b3884df1e58273ee7b6084c055bcc84090e2915967d8c6';
        // const reporterAddress = '0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177';
        await bancorX['setReporter(address,bool)'](reporter.address, true);
        console.log(`set reporter on bancor x ${reporter.address}`);

        await bbsToken.connect(signer).approve(bancorX.address, xtransferAmount);
        printContracts();
    });

    it('mint BBS and make x transfer', async function() {
        console.log('signer address', signer.address);

        const mintAmount = ethers.utils.parseEther('5');
        await bbsToken.mint(signer.address, mintAmount);
        console.log('BBS minted', mintAmount);

        const balanceBefore = (await bbsToken.balanceOf(signer.address));
        console.log('BBS balance before x transfer', balanceBefore);

        const eosBlockchain = ethers.utils.formatBytes32String('eos'); 
        const eosAddress = ethers.utils.formatBytes32String('tomeraccount'); 
        const xtransferId = Math.floor(Math.random() * (100000));


        // xtransfer
        const xTransfer = await bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: signer.address});
        console.log(xTransfer);

        const balanceAfter = (await bbsToken.balanceOf(signer.address));
        console.log('BBS balance after x transfer', balanceAfter);

        if (balanceAfter._hex !== '0x00') {
            throw new Error('balance should be 0');
        }

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        const reportTx = await bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, signer.address, xtransferAmount, xtransferId, {
            from: reporter.address
        });
        console.log(reportTx);

        const endBalance = (await bbsToken.balanceOf(signer.address));
        console.log('BBS balance after reoprt tx', endBalance);

        if (endBalance._hex !== mintAmount._hex) {
            throw new Error('balance should be the same as the mint amount');
        }

    });
});
