const { ethers } = require('hardhat');
const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');


describe('Bridge', function() {
    const COMMISSION_AMOUNT = 12;
    const MINT_AMOUNT = COMMISSION_AMOUNT + 1;
    const MIN_WITHDRAW_AMOUNT = COMMISSION_AMOUNT - 2;

    const MAX_LOCK_LIMIT = '40000000000000000000000';
    const MAX_RELEASE_LIMIT = '80000000000000000000000';
    const MIN_LIMIT = '1000000000000000000';
    const LIMIT_INC_PER_BLOCK = '500000000000000000000';
    const MIN_REQUIRED_REPORTS = 1;

    const commissionAmount = ethers.utils.parseEther(`${COMMISSION_AMOUNT}`);
    const mintAmount = ethers.utils.parseEther(`${MINT_AMOUNT}`);
    const minWithdrawlAmount = ethers.utils.parseEther(`${MIN_WITHDRAW_AMOUNT}`);

    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String('0123456789ab');
    const id = Math.floor(Math.random() * (100000));

    let accounts, bbsToken, bridge, bbsContractOwner, reporter, chainId, deadline, tokenName,
        tokenOwner, tokenSpender;

    beforeEach(async function() {
        accounts = await ethers.getSigners();
        bbsContractOwner = accounts[0];
        reporter = accounts[1];
        tokenOwner = accounts[2];

        const provider = bbsContractOwner.provider;
        chainId = provider._network.chainId;
        deadline = (await provider.getBlock(await provider.getBlockNumber())).timestamp + 10000000000;

        const Token = await ethers.getContractFactory('BBSToken');
        bbsToken = await Token.deploy();
        tokenName = await bbsToken.name();

        const Bridge = await ethers.getContractFactory('Bridge');
        bridge = await Bridge.deploy(
            MAX_LOCK_LIMIT,
            MAX_RELEASE_LIMIT,
            MIN_LIMIT,
            LIMIT_INC_PER_BLOCK,
            MIN_REQUIRED_REPORTS,
            commissionAmount,
            minWithdrawlAmount,
            bbsToken.address);
        tokenSpender = bridge.address;

        await bridge.setReporter(reporter.address, true);
    });

    async function signPremitData(signer, spender, value, nonce) {
        const signature = await signer._signTypedData(
            {name: tokenName, version: '1', chainId, verifyingContract: bbsToken.address},
            {Permit: [
                {name: 'owner', type: 'address'}, {name: 'spender', type: 'address'},
                {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'},
                {name: 'deadline', type: 'uint256'}
            ]},
            {owner: signer.address, spender, value, nonce, deadline});
        return ethers.utils.splitSignature(signature);
    }

    async function getNonce(account) {
        return (await bbsToken.nonces(account.address)).toNumber();
    }

    it('xTransfer', async function() {
        const BBSTransferAmount = ethers.utils.parseEther('10');
        const nonce = await getNonce(tokenOwner);
        const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, BBSTransferAmount, nonce);

        // params do not match signed data - should fail
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, ethers.utils.parseEther('11'), deadline, tokenOwner.address, v, r, s, id
        ), 'ERC20Permit: invalid signature');

        // wrong signer address - should fail
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenSpender, v, r, s, id
        ), 'ERC20Permit: invalid signature');

        // not enough bbs balance - should fail
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenOwner.address, v, r, s, id
        ), 'ERC20: transfer amount exceeds balance');

        await bbsToken.mint(tokenOwner.address, BBSTransferAmount);

        // test balances before xTransfer
        expect((await bbsToken.balanceOf(tokenOwner.address)).toString()).to.equal(BBSTransferAmount.toString());
        expectBigNum(await bbsToken.balanceOf(tokenSpender)).to.equal(0);

        // xTransfer
        await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenOwner.address, v, r, s, id);

        // test balances after xTransfer
        expectBigNum(await bbsToken.balanceOf(tokenOwner.address)).to.equal(0);
        expect((await bbsToken.balanceOf(tokenSpender)).toString()).to.equal(BBSTransferAmount.toString());

        // verify nonce
        expectBigNum(await bbsToken.nonces(tokenOwner.address)).to.equal(nonce + 1);

        // using the same signature - should fail
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenOwner.address, v, r, s, id
        ), 'ERC20Permit: invalid signature');
    });

    it('xTransfer can be transmitted by any account', async function() {
        const transmitter = accounts[3];
        const BBSTransferAmount = ethers.utils.parseEther('10');
        const TransmitterBBSbalance = ethers.utils.parseEther('5');

        const nonce = await getNonce(tokenOwner);
        const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, BBSTransferAmount, nonce);

        await bbsToken.mint(tokenOwner.address, BBSTransferAmount);
        await bbsToken.mint(transmitter.address, TransmitterBBSbalance);

        // test balances before xTransfer
        expect((await bbsToken.balanceOf(tokenOwner.address)).toString()).to.equal(BBSTransferAmount.toString());
        expectBigNum(await bbsToken.balanceOf(tokenSpender)).to.equal(0);
        expect((await bbsToken.balanceOf(transmitter.address)).toString()).to.equal(TransmitterBBSbalance.toString());

        // xTransfer
        await bridge.connect(transmitter).xTransfer(
            eosBlockchain, eosAddress, BBSTransferAmount, deadline, tokenOwner.address, v, r, s, id);

        // test balances after xTransfer
        expectBigNum(await bbsToken.balanceOf(tokenOwner.address)).to.equal(0);
        expect((await bbsToken.balanceOf(tokenSpender)).toString()).to.equal(BBSTransferAmount.toString());
        expect((await bbsToken.balanceOf(transmitter.address)).toString()).to.equal(TransmitterBBSbalance.toString());

        // verify nonce
        expectBigNum(await bbsToken.nonces(tokenOwner.address)).to.equal(nonce + 1);
    });

    it('should revert report tx - amount to release is lower than commission', async function() {
        await expectRevert(bridge.connect(reporter).reportTx(
            eosBlockchain, id, tokenOwner.address, ethers.utils.parseEther('10'), id
        ), 'ERR_VALUE_TOO_LOW');
    });

    it('should report tx - commission is reduced from release amount and total commissions updated', async function() {
        let currentTotalCommissions = await bridge.totalCommissions();
        expectBigNum(currentTotalCommissions).to.equal(0);

        await bbsToken.mint(tokenOwner.address, mintAmount);

        // xtransfer
        const xtransferAmount = mintAmount;
        const nonce = await getNonce(tokenOwner);
        const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, xtransferAmount, nonce);

        await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xtransferAmount, deadline, tokenOwner.address, v, r, s, id);

        const balanceAfter = (await bbsToken.balanceOf(tokenOwner.address));
        expectBigNum(balanceAfter).to.equal(0);

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bridge.connect(reporter).reportTx(
            eosBlockchain, txId, tokenOwner.address, xtransferAmount, id);

        const endBalance = (await bbsToken.balanceOf(tokenOwner.address));
        if (endBalance._hex != mintAmount._hex - commissionAmount._hex) {
            throw new Error('balance should be the same as mint amount - commission amount');
        }

        currentTotalCommissions = await bridge.totalCommissions();
        // current total commissions after first tx should be equal to commission amount
        expect(currentTotalCommissions._hex).to.equal(commissionAmount._hex);
    });

    it('should revert report tx - tx already reported(same id)', async function() {
        const xtransferAmount = mintAmount;
        await bbsToken.mint(tokenOwner.address, xtransferAmount);

        const nonce = await getNonce(tokenOwner);
        const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, xtransferAmount, nonce);

        await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xtransferAmount, deadline, tokenOwner.address, v, r, s, id);

        const balanceAfter = (await bbsToken.balanceOf(tokenOwner.address));
        expectBigNum(balanceAfter).to.equal(0);

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bridge.connect(reporter).reportTx(eosBlockchain, txId, tokenOwner.address, xtransferAmount, id);

        await expectRevert(bridge.connect(reporter).reportTx(
            eosBlockchain, txId, tokenOwner.address, xtransferAmount, id
        ), 'ERR_ALREADY_REPORTED');
    });

    it('set commission amount', async function() {
        await expectRevert(
            bridge.connect(reporter).setCommissionAmount(ethers.utils.parseEther('16')),
            'Ownable: caller is not the owner');

        const oldCommissions = await bridge.commissionAmount();
        await bridge.connect(bbsContractOwner).setCommissionAmount(ethers.utils.parseEther('16'));
        const newCommissions = await bridge.commissionAmount();
        expect(newCommissions._hex).to.not.equal(oldCommissions._hex);
    });

    it('withdraw commissions', async function() {
        let currentTotalCommissions = await bridge.totalCommissions();
        // current total commissions before first tx should be equal to 0
        expectBigNum(currentTotalCommissions).to.equal(0);

        await bbsToken.mint(tokenOwner.address, mintAmount);

        // xtransfer
        const xtransferAmount = mintAmount;
        const nonce = await getNonce(tokenOwner);
        const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, xtransferAmount, nonce);

        await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xtransferAmount, deadline, tokenOwner.address, v, r, s, id);

        const balanceAfter = (await bbsToken.balanceOf(tokenOwner.address));
        expectBigNum(balanceAfter).to.equal(0);

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bridge.connect(reporter).reportTx(
            eosBlockchain, txId, tokenOwner.address, xtransferAmount, id);

        const endBalance = (await bbsToken.balanceOf(tokenOwner.address));

        if (endBalance._hex != mintAmount._hex - commissionAmount._hex) {
            throw new Error('balance should be the same as mint amount - commission amount');
        }

        currentTotalCommissions = await bridge.totalCommissions();
        if (currentTotalCommissions._hex !== commissionAmount._hex) {
            throw new Error('current total commissions after first tx should be equal to commission amount');
        }

        await expectRevert(
            bridge.connect(tokenOwner).withdrawCommissions(tokenOwner.address)
            , 'Ownable: caller is not the owner'
        );

        await bridge.connect(bbsContractOwner).withdrawCommissions(bbsContractOwner.address);
        currentTotalCommissions = await bridge.totalCommissions();
        expectBigNum(currentTotalCommissions).to.equal(0);
    });

    it('minimum withdraw amount', async function() {
        const newMinWithdrawlValue = ethers.utils.parseEther(`${MIN_WITHDRAW_AMOUNT + 10}`);
        await expectRevert(
            bridge.connect(reporter).setMinWithdrawAmount(newMinWithdrawlValue),
            'Ownable: caller is not the owner');

        // set min withdraw amount
        const prevMinWithdrawl = await bridge.commissionAmount();
        await bridge.connect(bbsContractOwner).setMinWithdrawAmount(newMinWithdrawlValue);
        const curMinWithdrawl = await bridge.minWithdrawAmount();
        expect(curMinWithdrawl.toString()).to.not.equal(prevMinWithdrawl.toString());
        expect(curMinWithdrawl.toString()).to.equal(newMinWithdrawlValue.toString());

        // xtransfer
        await bbsToken.mint(tokenOwner.address, mintAmount);
        const xtransferAmount = mintAmount;
        const nonce = await getNonce(tokenOwner);
        const {v, r, s} = await signPremitData(tokenOwner, tokenSpender, xtransferAmount, nonce);

        await bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xtransferAmount, deadline, tokenOwner.address, v, r, s, id);

        // reportTx
        const txId = Math.floor(Math.random() * (100000));
        await bridge.connect(reporter).reportTx(
            eosBlockchain, txId, tokenOwner.address, xtransferAmount, id);

        await expectRevert(
            bridge.connect(bbsContractOwner).withdrawCommissions(bbsContractOwner.address)
            , 'ERR_VALUE_TOO_LOW'
        );

    });
});
