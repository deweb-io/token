const {expect} = require('chai');
const {expectRevert} = require('@openzeppelin/test-helpers');

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
        expect((await bbsToken.balanceOf(ownerAddress)).toNumber()).to.equal(0);
        expect((await bbsToken.balanceOf(notOwnerAddress)).toNumber()).to.equal(0);

        await bbsToken.mint(ownerAddress, 100);
        expect((await bbsToken.balanceOf(ownerAddress)).toNumber()).to.equal(100);
        expect((await bbsToken.balanceOf(notOwnerAddress)).toNumber()).to.equal(0);

        await expectRevert.unspecified(bbsToken.connect(accounts[1]).transferOwnership(notOwnerAddress));
        await expectRevert.unspecified(bbsToken.connect(accounts[1]).mint(notOwnerAddress, 100));
    });
});
