const { ethers } = require('hardhat');
const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');


describe('Bridge', function() {
    const commissionAmount = ethers.utils.parseEther('12');
    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String('0123456789ab');
    const xtransferId = Math.floor(Math.random() * (100000));

    let accounts, bbsToken, bridge, owner, reporter;

    beforeEach(async function() {
        accounts = await ethers.getSigners();
        owner = accounts[0];
        reporter = accounts[1];

        const Token = await ethers.getContractFactory('BBSToken');
        bbsToken = await Token.deploy();

        const Bridge = await ethers.getContractFactory('Bridge');
        bridge = await Bridge.deploy(
            '40000000000000000000000',
            '80000000000000000000000',
            '1000000000000000000',
            '500000000000000000000',
            1,
            commissionAmount,
            bbsToken.address);

        await bridge['setReporter(address,bool)'](reporter.address, true);
    });

    it('should revert xtransfer - not enough balance', async function() {
        const mintAmount = ethers.utils.parseEther('12');
        await bbsToken.mint(owner.address, mintAmount);

        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bridge.address, xtransferAmount);

        await expectRevert(bridge.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](
            eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: owner.address}
        ), 'transfer amount exceeds balance');
    });

    it('should make xtransfer - balance reduce to 0', async function() {
        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(owner.address, mintAmount);

        // xtransfer
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bridge.address, xtransferAmount);
        await bridge.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](
            eosBlockchain, eosAddress, xtransferAmount, 123, {from: owner.address});

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
        await bbsToken.connect(owner).approve(bridge.address, xtransferAmount);
        await bridge.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](
            eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: owner.address});

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await expectRevert(bridge.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](
            eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {from: reporter.address}
        ), 'ERR_VALUE_TOO_LOW');
    });

    it('should report tx - commission reduced from release amount and total commissions updated', async function() {
        let currentTotalCommissions = await bridge.currentTotalCommissions();
        if (currentTotalCommissions._hex != 0) {
            throw new Error('current total commissions before first tx should be equal to 0');
        }

        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(owner.address, mintAmount);


        // xtransfer
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bridge.address, xtransferAmount);
        await bridge.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](
            eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: owner.address});

        const balanceAfter = (await bbsToken.balanceOf(owner.address));
        if (balanceAfter._hex != 0) {
            throw new Error('balance should be 0');
        }

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bridge.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](
            eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {from: reporter.address});

        const endBalance = (await bbsToken.balanceOf(owner.address));

        if (endBalance._hex != mintAmount._hex - commissionAmount._hex) {
            throw new Error('balance should be the same as mint amount - commission amount');
        }

        currentTotalCommissions = await bridge.currentTotalCommissions();
        if (currentTotalCommissions._hex !== commissionAmount._hex) {
            throw new Error('current total commissions after first tx should be equal to commission amount');
        }
    });

    it('should revert report tx - tx already reported(same xtransferId)', async function() {
        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(owner.address, mintAmount);


        // xtransfer
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bridge.address, xtransferAmount);
        await bridge.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](
            eosBlockchain, eosAddress, xtransferAmount, 1234, {from: owner.address});

        const balanceAfter = (await bbsToken.balanceOf(owner.address));
        if (balanceAfter._hex != 0) {
            throw new Error('balance should be 0');
        }

        // reportTx
        const xtransferId = 1234;
        const txId = Math.floor(Math.random() * (100000));
        await bridge.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](
            eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {from: reporter.address});

        await expectRevert(bridge.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](
            eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {from: reporter.address}
        ), 'ERR_ALREADY_REPORTED');
    });

    it('test set commission amount', async function() {
        // caller is not the owner - revert
        await expectRevert(
            bridge.connect(reporter).setCommissionAmount(ethers.utils.parseEther('16')),
            'Ownable: caller is not the owner');

        const oldCommissions = await bridge.commissionAmount();
        await bridge.connect(owner).setCommissionAmount(ethers.utils.parseEther('16'));
        const newCommissions = await bridge.commissionAmount();
        if (newCommissions._hex == oldCommissions) {
            throw new Error('commission amount should be changed');
        }
    });

    it('xTransfer with permit', async function() {
        const tokenOwner = accounts[2];
        const tokenSpender = bridge.address;

        const BBSTransferAmount = ethers.utils.parseEther('10');

        const tokenName = await bbsToken.name();
        const nonce = (await bbsToken.nonces(tokenOwner.address)).toNumber();
        const provider = tokenOwner.provider;
        const chainId = provider._network.chainId;
        const latestBlockTimestamp = (await provider.getBlock(await provider.getBlockNumber())).timestamp;
        const deadline = latestBlockTimestamp + 10000000000;
        const txId = Math.floor(Math.random() * (100000));

        const signature = await tokenOwner._signTypedData(
            {name: tokenName, version: '1', chainId, verifyingContract: bbsToken.address},
            {Permit: [
                {name: 'owner', type: 'address'}, {name: 'spender', type: 'address'},
                {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'},
                {name: 'deadline', type: 'uint256'}
            ]},
            {owner: tokenOwner.address, spender: tokenSpender, value: BBSTransferAmount, nonce, deadline});
        const {v, r, s} = ethers.utils.splitSignature(signature);

        // params do not match signed data - should fail
        await expectRevert(bridge.connect(tokenOwner)[
            'xTransfer(bytes32,bytes32,uint256,uint256,address,uint8,bytes32,bytes32,uint256)'
        ](
            eosBlockchain, eosAddress, ethers.utils.parseEther('11'), deadline, tokenOwner.address, v, r, s, txId
        ), 'ERC20Permit: invalid signature');

        // wrong signer address - should fail
        await expectRevert(bridge.connect(tokenOwner)[
            'xTransfer(bytes32,bytes32,uint256,uint256,address,uint8,bytes32,bytes32,uint256)'
        ](
            eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenSpender, v, r, s, txId
        ), 'ERC20Permit: invalid signature');

        // not enough bbs balance - should fail
        await expectRevert(bridge.connect(tokenOwner)[
            'xTransfer(bytes32,bytes32,uint256,uint256,address,uint8,bytes32,bytes32,uint256)'
        ](
            eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenOwner.address, v, r, s, txId
        ), 'ERC20: transfer amount exceeds balance');

        await bbsToken.mint(tokenOwner.address, BBSTransferAmount);

        // test balances before xTransfer
        expect((await bbsToken.balanceOf(tokenOwner.address)).toString()).to.equal(BBSTransferAmount.toString());
        expectBigNum(await bbsToken.balanceOf(tokenSpender)).to.equal(0);

        // xTransfer
        await bridge.connect(tokenOwner)[
            'xTransfer(bytes32,bytes32,uint256,uint256,address,uint8,bytes32,bytes32,uint256)'
        ](eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenOwner.address, v, r, s, txId);

        // test balances after xTransfer
        expectBigNum(await bbsToken.balanceOf(tokenOwner.address)).to.equal(0);
        expect((await bbsToken.balanceOf(tokenSpender)).toString()).to.equal(BBSTransferAmount.toString());

        // verify nonce
        expectBigNum(await bbsToken.nonces(tokenOwner.address)).to.equal(nonce + 1);

        // using the same signature - should fail
        await expectRevert(bridge.connect(tokenOwner)[
            'xTransfer(bytes32,bytes32,uint256,uint256,address,uint8,bytes32,bytes32,uint256)'
        ](
            eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenOwner.address, v, r, s, txId
        ), 'ERC20Permit: invalid signature');
    });

    it('xTransfer with permit can be transmitted by any account', async function() {
        const tokenOwner = accounts[2];
        const tokenSpender = bridge.address;
        const transmitter = accounts[3];

        const BBSTransferAmount = ethers.utils.parseEther('10');
        const TransmitterBBSbalance = ethers.utils.parseEther('5');

        const tokenName = await bbsToken.name();
        const nonce = (await bbsToken.nonces(tokenOwner.address)).toNumber();
        const provider = tokenOwner.provider;
        const chainId = provider._network.chainId;
        const latestBlockTimestamp = (await provider.getBlock(await provider.getBlockNumber())).timestamp;
        const deadline = latestBlockTimestamp + 10000000000;
        const txId = Math.floor(Math.random() * (100000));

        const signature = await tokenOwner._signTypedData(
            {name: tokenName, version: '1', chainId, verifyingContract: bbsToken.address},
            {Permit: [
                {name: 'owner', type: 'address'}, {name: 'spender', type: 'address'},
                {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'},
                {name: 'deadline', type: 'uint256'}
            ]},
            {owner: tokenOwner.address, spender: tokenSpender, value: BBSTransferAmount, nonce, deadline});
        const {v, r, s} = ethers.utils.splitSignature(signature);

        await bbsToken.mint(tokenOwner.address, BBSTransferAmount);
        await bbsToken.mint(transmitter.address, TransmitterBBSbalance);

        // test balances before xTransfer
        expect((await bbsToken.balanceOf(tokenOwner.address)).toString()).to.equal(BBSTransferAmount.toString());
        expectBigNum(await bbsToken.balanceOf(tokenSpender)).to.equal(0);
        expect((await bbsToken.balanceOf(transmitter.address)).toString()).to.equal(TransmitterBBSbalance.toString());

        // xTransfer
        await bridge.connect(transmitter)[
            'xTransfer(bytes32,bytes32,uint256,uint256,address,uint8,bytes32,bytes32,uint256)'
        ](eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenOwner.address, v, r, s, txId);

        // test balances after xTransfer
        expectBigNum(await bbsToken.balanceOf(tokenOwner.address)).to.equal(0);
        expect((await bbsToken.balanceOf(tokenSpender)).toString()).to.equal(BBSTransferAmount.toString());
        expect((await bbsToken.balanceOf(transmitter.address)).toString()).to.equal(TransmitterBBSbalance.toString());

        // verify nonce
        expectBigNum(await bbsToken.nonces(tokenOwner.address)).to.equal(nonce + 1);
    });

    it('should withdraw commissions', async function() {
        let currentTotalCommissions = await bridge.currentTotalCommissions();
        if (currentTotalCommissions._hex != 0) {
            throw new Error('current total commissions before first tx should be equal to 0');
        }

        const mintAmount = ethers.utils.parseEther('13');
        await bbsToken.mint(owner.address, mintAmount);

        // xtransfer
        const xtransferAmount = ethers.utils.parseEther('13');
        await bbsToken.connect(owner).approve(bridge.address, xtransferAmount);
        await bridge.connect(owner)['xTransfer(bytes32,bytes32,uint256,uint256)'](
            eosBlockchain, eosAddress, xtransferAmount, xtransferId, {from: owner.address});

        const balanceAfter = (await bbsToken.balanceOf(owner.address));
        if (balanceAfter._hex != 0) {
            throw new Error('balance should be 0');
        }

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bridge.connect(reporter)['reportTx(bytes32,uint256,address,uint256,uint256)'](
            eosBlockchain, txId, owner.address, xtransferAmount, xtransferId, {from: reporter.address});

        const endBalance = (await bbsToken.balanceOf(owner.address));

        if (endBalance._hex != mintAmount._hex - commissionAmount._hex) {
            throw new Error('balance should be the same as mint amount - commission amount');
        }

        currentTotalCommissions = await bridge.currentTotalCommissions();
        if (currentTotalCommissions._hex !== commissionAmount._hex) {
            throw new Error('current total commissions after first tx should be equal to commission amount');
        }

        await bridge.connect(owner)['withdrawCommissions(address)'](owner.address, {
            from: owner.address
        });

        currentTotalCommissions = await bridge.currentTotalCommissions();
        if (currentTotalCommissions._hex != 0) {
            throw new Error('current total commissions should be 0 after withdraw');
        }
    });
});
