const { ethers } = require('hardhat');
const { expectRevert } = require('./utils');


describe('Bridge', function() {
    let bbsToken;
    let bancorX;
    let accounts;
    let signer;
    let reporter;
    const commission = ethers.utils.parseEther('12');
    const eosBlockchain = ethers.utils.formatBytes32String('eos'); 
    const eosAddress = ethers.utils.formatBytes32String('tomeraccount'); 
    const xtransferId = Math.floor(Math.random() * (100000));

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
        console.log('signer address', signer.address);

        const Token = await ethers.getContractFactory('BBSToken');
        bbsToken = await Token.deploy();

        const BancorX = await ethers.getContractFactory('BancorX');
        bancorX = await BancorX.deploy(
            '40000000000000000000000',
            '80000000000000000000000',
            '1000000000000000000',
            '500000000000000000000',
            1,
            commission,
            bbsToken.address);

        await bancorX['setReporter(address,bool)'](reporter.address, true);
        console.log(`set reporter on bancor x ${reporter.address}`);

        printContracts();
    });
    
    it('should revert xtransfer - not enough balance', async function() {
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(signer).approve(bancorX.address, xtransferAmount);

        const mintAmount = ethers.utils.parseEther('12');
        await bbsToken.mint(signer.address, mintAmount);

        await expectRevert(bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: signer.address}), 'transfer amount exceeds balance');
    });

    it('should make xtransfer - balance reduce to 0', async function() {
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(signer).approve(bancorX.address, xtransferAmount);

        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(signer.address, mintAmount);

        // xtransfer
        await bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, 123, {from: signer.address});

        const balanceAfter = (await bbsToken.balanceOf(signer.address));
        if (balanceAfter._hex !== '0x00') {
            throw new Error('balance should be 0');
        }
    });

    it('should revert report tx - amount lower than commission', async function() {
        const xtransferAmount = ethers.utils.parseEther('10');
        await bbsToken.connect(signer).approve(bancorX.address, xtransferAmount);

        const mintAmount = ethers.utils.parseEther('10');
        await bbsToken.mint(signer.address, mintAmount);

        // xtransfer
        await bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: signer.address});

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await expectRevert(bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, signer.address, xtransferAmount, xtransferId, {
            from: reporter.address
        }), 'ERR_VALUE_TOO_LOW');
    });

    it('should report tx - commission reduced from amount', async function() {
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(signer).approve(bancorX.address, xtransferAmount);

        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(signer.address, mintAmount);

        // xtransfer
        await bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: signer.address});

        const balanceAfter = (await bbsToken.balanceOf(signer.address));
        if (balanceAfter._hex !== '0x00') {
            throw new Error('balance should be 0');
        }

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, signer.address, xtransferAmount, xtransferId, {
            from: reporter.address
        });

        const endBalance = (await bbsToken.balanceOf(signer.address));

        if (endBalance._hex - 0 !== mintAmount._hex - commission._hex) {
            throw new Error('balance should be the same as mint amount - commission');
        }
    });

    it('should revert report tx - tx already reported(same xtransferId)', async function() {
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(signer).approve(bancorX.address, xtransferAmount);

        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(signer.address, mintAmount);

        // xtransfer
        await bancorX.connect(signer)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, 1234, {from: signer.address});

        const balanceAfter = (await bbsToken.balanceOf(signer.address));
        if (balanceAfter._hex !== '0x00') {
            throw new Error('balance should be 0');
        }

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, signer.address, xtransferAmount, 1234, {
            from: reporter.address
        });

        await expectRevert(bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, signer.address, xtransferAmount, 1234, {
            from: reporter.address
        }), 'ERR_ALREADY_REPORTED');
    });

});
