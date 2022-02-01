const { ethers } = require('hardhat');
const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');
const {signPermit} = require('../scripts/utils/utils');


describe('Bridge', function() {
    const COMMISSION_AMOUNT = 12;
    const XTRANSFER_AMOUNT = COMMISSION_AMOUNT + 1;

    const MAX_LOCK_LIMIT = ethers.utils.parseEther('40000');
    const MAX_RELEASE_LIMIT = ethers.utils.parseEther('80000');
    const MIN_LIMIT = ethers.utils.parseEther('1');
    const LIMIT_INC_PER_BLOCK = ethers.utils.parseEther('500');
    const MIN_REQUIRED_REPORTS = 1;

    const XTRANSFER_EVENT = 'XTransfer';
    const TOKENS_LOCK_EVENT = 'TokensLock';

    const commissionAmount = ethers.utils.parseEther(`${COMMISSION_AMOUNT}`);
    const xTransferAmount = ethers.utils.parseEther(`${XTRANSFER_AMOUNT}.0001`);

    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String('0123456789ab');

    const reportTxId = Math.floor(Math.random() * (100000));
    const reportTransferId = 0;

    let accounts, bbsToken, bridge, bbsContractOwner, reporter, deadline, tokenName,
        tokenOwner, tokenSpender;

    beforeEach(async function() {
        accounts = await ethers.getSigners();
        bbsContractOwner = accounts[0];
        reporter = accounts[1];
        tokenOwner = accounts[2];

        const provider = bbsContractOwner.provider;
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
            bbsToken.address);
        tokenSpender = bridge.address;

        await bridge.setReporters([reporter.address], [true]);
    });

    async function getNonce(account) {
        return (await bbsToken.nonces(account.address)).toNumber();
    }

    /**
     * Used in tests where we do not test the xTransfer itself.
     * @param {} amount
     * @param {*} transmitter
     */
    async function xTransfer(amount, transmitter) {
        const {v, r, s} = await signPermit(tokenOwner, tokenSpender, amount, deadline, bbsToken, tokenName);
        await expect(bridge.connect(transmitter).xTransfer(
            eosBlockchain, eosAddress, amount, deadline, tokenOwner.address, v, r, s
        )).to.emit(
            bridge, XTRANSFER_EVENT).withArgs(tokenOwner.address, eosBlockchain, eosAddress, amount, 0
        ).and.emit(
            bridge, TOKENS_LOCK_EVENT).withArgs(tokenOwner.address, amount);
    }

    it(XTRANSFER_EVENT, async function() {
        const nonceBeforeTransfer = await getNonce(tokenOwner);
        const {v, r, s} = await signPermit(tokenOwner, tokenSpender, xTransferAmount, deadline, bbsToken, tokenName);

        // params do not match signed data - should fail
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, ethers.utils.parseEther('11'), deadline, tokenOwner.address, v, r, s
        ), 'ERC20Permit: invalid signature');

        // wrong signer address - should fail
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferAmount, deadline, tokenSpender, v, r, s
        ), 'can not use permit for delegation');

        // not enough bbs balance - should fail
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferAmount, deadline, tokenOwner.address, v, r, s
        ), 'ERC20: transfer amount exceeds balance');

        await bbsToken.mint(tokenOwner.address, xTransferAmount);

        // test balances before xTransfer
        expect((await bbsToken.balanceOf(tokenOwner.address)).toString()).to.equal(xTransferAmount.toString());
        expectBigNum(await bbsToken.balanceOf(tokenSpender)).to.equal(0);

        // too many decimals - should fail
        const xTransferInvalidAmount = ethers.utils.parseEther(`${XTRANSFER_AMOUNT}.00001`);
        const sig = await signPermit(tokenOwner, tokenSpender, xTransferInvalidAmount, deadline, bbsToken, tokenName);
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferInvalidAmount, deadline, tokenOwner.address, sig.v, sig.r, sig.s
        ), 'ERR_AMOUNT_TOO_MANY_DECIMALS');

        // xTransfer
        await expect(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferAmount, deadline, tokenOwner.address, v, r, s)
        ).to.emit(bridge, XTRANSFER_EVENT).withArgs(tokenOwner.address, eosBlockchain, eosAddress, xTransferAmount, 0);

        // test balances after xTransfer
        expectBigNum(await bbsToken.balanceOf(tokenOwner.address)).to.equal(0);
        expect((await bbsToken.balanceOf(tokenSpender)).toString()).to.equal(xTransferAmount.toString());

        // verify nonce
        expectBigNum(await bbsToken.nonces(tokenOwner.address)).to.equal(nonceBeforeTransfer + 1);

        // using the same signature - should fail
        await expectRevert(bridge.connect(tokenOwner).xTransfer(
            eosBlockchain, eosAddress, xTransferAmount, deadline, tokenOwner.address, v, r, s
        ), 'ERC20Permit: invalid signature');
    });

    it('should revert report tx - amount to release is lower than commission', async function() {
        await expectRevert(bridge.connect(reporter).reportTx(
            eosBlockchain, reportTxId, tokenOwner.address, ethers.utils.parseEther('10'), reportTransferId
        ), 'ERR_VALUE_TOO_LOW');
    });

    it('should report tx - commission is reduced from release amount and total commissions updated', async function() {
        let currentTotalCommissions = await bridge.totalCommissions();
        expectBigNum(currentTotalCommissions).to.equal(0);

        await bbsToken.mint(tokenOwner.address, xTransferAmount);

        // xtransfer
        await xTransfer(xTransferAmount, tokenOwner);

        // reportTx
        await bridge.connect(reporter).reportTx(
            eosBlockchain, reportTxId, tokenOwner.address, xTransferAmount, reportTransferId);

        const endBalance = (await bbsToken.balanceOf(tokenOwner.address));
        if (endBalance._hex != xTransferAmount._hex - commissionAmount._hex) {
            throw new Error('balance should be the same as mint amount - commission amount');
        }

        currentTotalCommissions = await bridge.totalCommissions();
        // current total commissions after first tx should be equal to commission amount
        expect(currentTotalCommissions._hex).to.equal(commissionAmount._hex);
    });

    it('should revert report tx - tx already reported(same txId)', async function() {
        await bbsToken.mint(tokenOwner.address, xTransferAmount);

        await xTransfer(xTransferAmount, tokenOwner);

        // reportTx
        await bridge.connect(reporter).reportTx(eosBlockchain, reportTxId,
            tokenOwner.address, xTransferAmount, reportTransferId);

        await expectRevert(bridge.connect(reporter).reportTx(
            eosBlockchain, reportTxId, tokenOwner.address, xTransferAmount, reportTransferId
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

        await bbsToken.mint(tokenOwner.address, xTransferAmount);

        await xTransfer(xTransferAmount, tokenOwner);

        // reportTx
        await bridge.connect(reporter).reportTx(
            eosBlockchain, reportTxId, tokenOwner.address, xTransferAmount, reportTransferId);

        const endBalance = (await bbsToken.balanceOf(tokenOwner.address));

        if (endBalance._hex != xTransferAmount._hex - commissionAmount._hex) {
            throw new Error('balance should be the same as mint amount - commission amount');
        }

        currentTotalCommissions = await bridge.totalCommissions();
        if (currentTotalCommissions._hex !== commissionAmount._hex) {
            throw new Error('current total commissions after first tx should be equal to commission amount');
        }

        // withdraw
        await expectRevert(
            bridge.connect(tokenOwner).withdrawCommissions(tokenOwner.address)
            , 'Ownable: caller is not the owner'
        );

        expect(await bbsToken.balanceOf(bbsContractOwner.address)).to.equal(0);
        await expect(
            bridge.connect(bbsContractOwner).withdrawCommissions(bbsContractOwner.address)
        ).to.emit(bridge, 'CommissionsWithdraw');

        // after withdraw
        currentTotalCommissions = await bridge.totalCommissions();
        expectBigNum(currentTotalCommissions).to.equal(0);
        expect(await bbsToken.balanceOf(bbsContractOwner.address)).to.equal(commissionAmount);
    });

    it('set min limit amount', async function() {
        await expectRevert(
            bridge.connect(reporter).setMinLimit(ethers.utils.parseEther('16')),
            'Ownable: caller is not the owner');

        const newMinitLimitValue = ethers.utils.parseEther('100');

        const oldminLimit = await bridge.minLimit();
        await bridge.connect(bbsContractOwner).setMinLimit(newMinitLimitValue);
        const newMinLimit = await bridge.minLimit();
        expect(newMinLimit).to.not.equal(oldminLimit._hex);
        expect(newMinLimit).to.equal(newMinitLimitValue._hex);
    });
});
