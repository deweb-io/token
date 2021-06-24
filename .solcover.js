module.exports = {
    skipFiles: ['StakingUpgrade.sol'],
    silent: false,
    mocha: {
        grep: "@skipOnCoverage",
        invert: true
    }
};
