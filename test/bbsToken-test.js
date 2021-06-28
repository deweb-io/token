const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');

describe('BBSToken (our token is almost entirely written by openzeppelin, so we just verify our usage)', () => {
    let accounts, bbsToken, ownerAddress, notOwnerAddress;
    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        bbsToken = await BBSToken.deploy();
        accounts = await ethers.getSigners();
        ownerAddress = accounts[0].address;
        notOwnerAddress = accounts[1].address;
    });

    it('test change of ownership', async() => {
        expect(await bbsToken.owner()).to.equal(ownerAddress);
        await bbsToken.transferOwnership(notOwnerAddress);
        expect(await bbsToken.owner()).to.equal(notOwnerAddress);
    });

    it('test tokens minting', async() => {
        expectBigNum(await bbsToken.balanceOf(ownerAddress)).to.equal(0);
        expectBigNum(await bbsToken.balanceOf(notOwnerAddress)).to.equal(0);

        await bbsToken.mint(ownerAddress, 100);
        expectBigNum(await bbsToken.balanceOf(ownerAddress)).to.equal(100);
        expectBigNum(await bbsToken.balanceOf(notOwnerAddress)).to.equal(0);

        await expectRevert(bbsToken.connect(accounts[1]).transferOwnership(notOwnerAddress), 'caller is not the owner');
        await expectRevert(bbsToken.connect(accounts[1]).mint(notOwnerAddress, 100), 'caller is not the owner');
    });

    it('test permit mechanism', async() => {
        const Permit = [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ];

        const mnemonic = "announce room limb pattern dry unit scale effort smooth jazz weasel alcohol";
        const wallet = ethers.Wallet.fromMnemonic(mnemonic);
        const owner = wallet.address;
        const spender = accounts[1].address;
        const value = 100;
        const nonce = (await bbsToken.nonces(owner)).toNumber();
        const chainId = (await bbsToken.getChainId()).toNumber();

        const provider = ethers.getDefaultProvider();
        const latestBlockTimestamp = (await provider.getBlock(await provider.getBlockNumber( ))).timestamp;
        const deadline = latestBlockTimestamp + 10000000000;

        const signature = await wallet._signTypedData(
            { name: 'BBS', version: '1', chainId, verifyingContract: bbsToken.address},
            { Permit },
            { owner, spender, value, nonce, deadline });

        const { v, r, s }  = ethers.utils.splitSignature(signature);

        expect((await bbsToken.allowance(owner, spender)).toNumber()).to.equal(0);
        await bbsToken.permit(owner, spender, value, deadline, v, r, s);
        expect((await bbsToken.allowance(owner, spender)).toNumber()).to.equal(100);
        expect((await bbsToken.nonces(owner)).toNumber()).to.equal(1);
    });
});
