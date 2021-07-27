const { ethers } = require('hardhat');
const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');


describe('Bridge', function() {
    const commissionAmount = ethers.utils.parseEther('12');
    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String('tomeraccount');
    const xtransferId = Math.floor(Math.random() * (100000));

    let bbsToken, bancorX, owner, reporter;

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
        let accounts = await ethers.getSigners();
        owner = accounts[0];
        reporter = accounts[1];
        console.log('owner address', owner.address);

        const Token = await ethers.getContractFactory('BBSToken');
        bbsToken = await Token.deploy();

        const BancorX = await ethers.getContractFactory('BancorX');
        bancorX = await BancorX.deploy(
            '40000000000000000000000',
            '80000000000000000000000',
            '1000000000000000000',
            '500000000000000000000',
            1,
            commissionAmount,
            bbsToken.address);

        await bancorX['setReporter(address,bool)'](reporter.address, true);
        console.log(`set reporter on bancor x ${reporter.address}`);

        printContracts();
    });

    it('should revert xtransfer - not enough balance', async function() {
        const mintAmount = ethers.utils.parseEther('12');
        await bbsToken.mint(owner.address, mintAmount);

        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bancorX.address, xtransferAmount);

        await expectRevert(bancorX.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: owner.address}), 'transfer amount exceeds balance');
    });

    it('should make xtransfer - balance reduce to 0', async function() {
        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(owner.address, mintAmount);

        // xtransfer
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bancorX.address, xtransferAmount);
        await bancorX.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, 123, {from: owner.address});

        const balanceAfter = (await bbsToken.balanceOf(owner.address));
        if (balanceAfter._hex != 0) {
            throw new Error('balance should be 0');
        }
    });

    it('should revert report tx - amount lower than commission', async function() {
        const mintAmount = ethers.utils.parseEther('10');
        await bbsToken.mint(owner.address, mintAmount);

        // xtransfer
        const xtransferAmount = ethers.utils.parseEther('10');
        await bbsToken.connect(owner).approve(bancorX.address, xtransferAmount);
        await bancorX.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: owner.address});

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await expectRevert(bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {
            from: reporter.address
        }), 'ERR_VALUE_TOO_LOW');
    });

    it('should report tx - commission reduced from release amount and total commissions updated', async function() {
        let currentTotalCommissions = await bancorX.currentTotalCommissions();
        if (currentTotalCommissions._hex != 0) {
            throw new Error('current total commissions before first tx should be equal to 0');
        }

        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(owner.address, mintAmount);


        // xtransfer
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bancorX.address, xtransferAmount);
        await bancorX.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: owner.address});

        const balanceAfter = (await bbsToken.balanceOf(owner.address));
        if (balanceAfter._hex != 0) {
            throw new Error('balance should be 0');
        }

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {
            from: reporter.address
        });

        const endBalance = (await bbsToken.balanceOf(owner.address));

        if (endBalance._hex != mintAmount._hex - commissionAmount._hex) {
            throw new Error('balance should be the same as mint amount - commission amount');
        }

        currentTotalCommissions = await bancorX.currentTotalCommissions();
        if (currentTotalCommissions._hex !== commissionAmount._hex) {
            throw new Error('current total commissions after first tx should be equal to commission amount');
        }
    });

    it('should revert report tx - tx already reported(same xtransferId)', async function() {
        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(owner.address, mintAmount);


        // xtransfer
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bancorX.address, xtransferAmount);
        await bancorX.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](eosBlockchain, eosAddress, xtransferAmount, 1234, {from: owner.address});

        const balanceAfter = (await bbsToken.balanceOf(owner.address));
        if (balanceAfter._hex != 0) {
            throw new Error('balance should be 0');
        }

        // reportTx
        const xtransferId = 1234;
        const txId = Math.floor(Math.random() * (100000));
        await bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {
            from: reporter.address
        });

        await expectRevert(bancorX.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {
            from: reporter.address
        }), 'ERR_ALREADY_REPORTED');
    });

    it('test set commission amount', async function() {
        // caller is not the owner - revert
        await expectRevert(bancorX.connect(reporter).setCommissionAmount(ethers.utils.parseEther('16')), 'ERR_ACCESS_DENIED');

        const oldCommissions = await bancorX.commissionAmount();
        await bancorX.connect(owner).setCommissionAmount(ethers.utils.parseEther('16'));
        const newCommissions = await bancorX.commissionAmount();
        if (newCommissions._hex == oldCommissions) {
            throw new Error('commission amount should be changed');
        }
    });

    it('xTransfer with permit', async function() {
        //const owner = signer;
        const spender = bancorX.address;

        const BBSTransferAmount = ethers.utils.parseEther('10');

        const eosBlockchain = ethers.utils.formatBytes32String('eos');
        const eosAddress = ethers.utils.formatBytes32String('tomeraccount');
        const txId = Math.floor(Math.random() * (100000));

        const tokenName = await bbsToken.name();
        const nonce = (await bbsToken.nonces(owner.address)).toNumber();
        const provider = owner.provider;
        const chainId = provider._network.chainId;
        const latestBlockTimestamp = (await provider.getBlock(await provider.getBlockNumber())).timestamp;
        const deadline = latestBlockTimestamp + 10000000000;

        const signature = await owner._signTypedData(
            {name: tokenName, version: '1', chainId, verifyingContract: bbsToken.address},
            {Permit: [
                {name: 'owner', type: 'address'}, {name: 'spender', type: 'address'},
                {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'},
                {name: 'deadline', type: 'uint256'}
            ]},
            {owner: owner.address, spender, value: BBSTransferAmount, nonce, deadline});

        const {v, r, s} = ethers.utils.splitSignature(signature);

        //send different data should be fail
        await expectRevert(bancorX.connect(owner)
            ['xTransfer(bytes32,bytes32,uint256,uint256,uint256,uint8,bytes32,bytes32)']
                (eosBlockchain, eosAddress, ethers.utils.parseEther('11'), txId, deadline, v, r, s),
                'ERC20Permit: invalid signature!!!');

        //test balances before xTransfer
        await bbsToken.mint(owner.address, BBSTransferAmount);
        expect((await bbsToken.balanceOf(owner.address)).toString()).to.equal(BBSTransferAmount.toString());
        expectBigNum(await bbsToken.balanceOf(spender)).to.equal(0);

        //xTransfer
        await bancorX.connect(owner)
            ['xTransfer(bytes32,bytes32,uint256,uint256,uint256,uint8,bytes32,bytes32)']
                (eosBlockchain, eosAddress, BBSTransferAmount, txId, deadline, v, r, s);

        //test balances after xTransfer
        expectBigNum(await bbsToken.balanceOf(owner.address)).to.equal(0);
        expect((await bbsToken.balanceOf(spender)).toString()).to.equal(BBSTransferAmount.toString());

        //verify nonce
        expectBigNum(await bbsToken.nonces(owner.address)).to.equal(nonce + 1);

        //using the same signature should fail
        await expectRevert(bancorX.connect(owner)
            ['xTransfer(bytes32,bytes32,uint256,uint256,uint256,uint8,bytes32,bytes32)']
                (eosBlockchain, eosAddress, BBSTransferAmount, txId, deadline, v, r, s),
                'ERC20Permit: invalid signature!!!');
    });
});
