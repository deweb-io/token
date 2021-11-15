/* Utilities for our deployment. */
const hardhat = require('hardhat');

module.exports = {
    signPermit: async(signer, spender, value, deadline, verifyingContract, tokenName) => {
        const nonce = (await verifyingContract.nonces(signer.address)).toNumber();
        const signature = await signer._signTypedData({
            name: tokenName, version: '1',
            chainId: signer.provider._network.chainId, verifyingContract: verifyingContract.address
        }, {Permit: [
            {name: 'owner', type: 'address'}, {name: 'spender', type: 'address'},
            {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'},
            {name: 'deadline', type: 'uint256'}
        ]}, {owner: signer.address, spender, value, nonce, deadline});
        return ethers.utils.splitSignature(signature);
    },
    getSigner: async() => {
        return (await hardhat.ethers.getSigners())[0];
    }
};
