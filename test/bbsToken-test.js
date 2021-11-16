const {expect} = require('chai');
const {expectRevert, expectBigNum } = require('./utils');
const {signPermit} = require('../scripts/utils/utils');

describe('BBSToken (our token is almost entirely written by openzeppelin, so we just verify our usage)', () => {
    let accounts, bbsToken, bbsContractOwner;
    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        bbsToken = await BBSToken.deploy();
        accounts = await ethers.getSigners();
        bbsContractOwner = accounts[0].address;
    });

    it('test change of ownership', async() => {
        expect(await bbsToken.owner()).to.equal(bbsContractOwner);
        await bbsToken.transferOwnership(accounts[1].address);
        expect(await bbsToken.owner()).to.equal(accounts[1].address);
    });

    it('test tokens minting', async() => {
        expectBigNum(await bbsToken.balanceOf(bbsContractOwner)).to.equal(0);
        expectBigNum(await bbsToken.balanceOf(accounts[1].address)).to.equal(0);

        await bbsToken.mint(bbsContractOwner, 100);
        expectBigNum(await bbsToken.balanceOf(bbsContractOwner)).to.equal(100);
        expectBigNum(await bbsToken.balanceOf(accounts[1].address)).to.equal(0);

        await expectRevert(bbsToken.connect(accounts[1]).transferOwnership(accounts[2].address), 'caller is not the owner');
        await expectRevert(bbsToken.connect(accounts[1]).mint(accounts[2].address, 100), 'caller is not the owner');
    });

    it('test permit mechanism', async() => {
        const tokenOwner = accounts[1];
        const tokenSpender = accounts[2];
        const transmitter = accounts[3];
        const value = 100;
        const tokenName = await bbsToken.name();
        const nonce = (await bbsToken.nonces(tokenOwner.address)).toNumber();
        const provider = accounts[0].provider;
        const latestBlockTimestamp = (await provider.getBlock(await provider.getBlockNumber())).timestamp;
        const deadline = latestBlockTimestamp + 10000000000;

        const {v, r, s} = await signPermit(tokenOwner, tokenSpender.address, value, deadline, bbsToken, tokenName);

        expect((await bbsToken.allowance(tokenOwner.address, tokenSpender.address)).toNumber()).to.equal(0);
        await bbsToken.connect(transmitter).permit(tokenOwner.address, tokenSpender.address, value, deadline, v, r, s);
        expect((await bbsToken.allowance(tokenOwner.address, tokenSpender.address)).toNumber()).to.equal(value);
        expect((await bbsToken.nonces(tokenOwner.address)).toNumber()).to.equal(nonce + 1);
    });
});
