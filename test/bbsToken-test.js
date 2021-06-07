const {expect} = require('chai');
const {expectRevert, expectBigNum} = require('./utils');

describe('BBSToken', () => {
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
});
