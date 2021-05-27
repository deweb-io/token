const { expect } = require('chai');
const chai = require('chai');
chai.use(require('chai-string'));

describe('BBSToken', function() {
    it('test change of ownership', async function() {
        const accounts = await ethers.getSigners();
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const bbsToken = await BBSToken.deploy();

        const deployer = accounts[0].address;
        expect(await bbsToken.owner()).to.equal(deployer);
        await bbsToken.transferOwnership(accounts[1].address);
        expect(await bbsToken.owner()).to.equal(accounts[1].address);
    });

    it('test tokens minting', async function() {
        const accounts = await ethers.getSigners();
        const BBSToken = await ethers.getContractFactory('BBSToken');
        const bbsToken = await BBSToken.deploy();

        const ownerAccount = accounts[0].address;
        const notOwnerAccount = accounts[1].address;

        expect((await bbsToken.balanceOf(ownerAccount)).toNumber(10)).to.equal(0);
        expect((await bbsToken.balanceOf(notOwnerAccount)).toNumber(10)).to.equal(0);
        await bbsToken.mint(ownerAccount, 100);
        expect((await bbsToken.balanceOf(ownerAccount)).toNumber(10)).to.equal(100);
        expect((await bbsToken.balanceOf(notOwnerAccount)).toNumber(10)).to.equal(0);

        try {
            await bbsToken.transferOwnership(notOwnerAccount);
            await bbsToken.mint(ownerAccount, 100);
        } catch(exception) {
            expect(exception.toString()).to.endsWith('Ownable: caller is not the owner');
        }

        expect((await bbsToken.balanceOf(notOwnerAccount)).toNumber(10)).to.equal(0);
    });
});
