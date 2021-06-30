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
    }
};
