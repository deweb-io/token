/* Utilities for our tests. */
const {expect} = require('chai');

// A simple generator to create a reversed range ([n-1, n-2 ... 1, 0]).
function* reversedXrange(length){while(length > 0){yield --length;}}

module.exports = {
    range: (length) => [...reversedXrange(length)].reverse(),
    expectBigNum: (bigNumber) => expect(bigNumber.toNumber()),
    // This is more or less lifted from openzeppeling/test-helpers, which
    // provides more help than we currently need, and, in fact, provides so
    // much help it completely fails on my personal environment.
    expectRevert: async(promise, expectedError) => {
        promise.catch(() => {}); // Avoids uncaught promise rejections in case an input validation causes us to return early
        try{await promise;}
        catch(error){
            error.message.endsWith(`${expectedError}'`) || expect(error.message).to.equal(
                expectedError, 'error does not end in expected string');
            return;
        }
        expect.fail('no error thrown');
    },
    signPremitData: async(signer, spender, value, nonce, tokenName, chainId, verifyingContract, deadline) => {
        const signature = await signer._signTypedData(
            {name: tokenName, version: '1', chainId, verifyingContract},
            {Permit: [
                {name: 'owner', type: 'address'}, {name: 'spender', type: 'address'},
                {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'},
                {name: 'deadline', type: 'uint256'}
            ]},
            {owner: signer.address, spender, value, nonce, deadline});
        return ethers.utils.splitSignature(signature);
    }
};
