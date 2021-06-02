const hardhat = require('hardhat');
async function main() {
    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const token = await Token.deploy();
    const bbsToken = await token.deployed();
    console.log('token deployed to:', token.address);

    const Rewards = await hardhat.ethers.getContractFactory('DailyRewards');
    const rewards = await Rewards.deploy(bbsToken.address);
    await rewards.deployed();
    console.log('rewards deployed to:', rewards.address);

    const Staking = await hardhat.ethers.getContractFactory('Staking');
    const staking = await upgrades.deployProxy(Staking, [bbsToken.address]);
    await staking.deployed();
    console.log('staking deployed to:', staking.address);
}

main().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
