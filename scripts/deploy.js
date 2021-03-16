const hre = require("hardhat");
async function main() {
    const Token = await hre.ethers.getContractFactory("BBSToken");
    const token = await Token.deploy();
    const bbsToken = await token.deployed();
    console.log("token deployed to:", token.address);

    const Rewards = await hre.ethers.getContractFactory("DailyRewards");
    const rewards = await Rewards.deploy(bbsToken.address);
    await rewards.deployed();
    console.log("rewards deployed to:", rewards.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
