const { expect } = require("chai");

describe('RewardsSender tests', () => {
    let accounts, bbsToken, bridge, rewardsSender;

    const MAX_LOCK_LIMIT = '40000000000000000000000';
    const MAX_RELEASE_LIMIT = '80000000000000000000000';
    const MIN_LIMIT = '1000000000000000000';
    const LIMIT_INC_PER_BLOCK = '500000000000000000000';
    const MIN_REQUIRED_REPORTS = 1;
    const REWARDS_MAX_LOCK_LIMIT = ethers.utils.parseEther(`100000`);
    const commissionAmount = ethers.utils.parseEther(`1`);
    const eosBlockchain = ethers.utils.formatBytes32String('eos');
    const eosAddress = ethers.utils.formatBytes32String('0123456789ab');

    beforeEach(async() => {
        const BBSToken = await ethers.getContractFactory('BBSToken');
        bbsToken = await BBSToken.deploy();

        const sendRewardsStruct = ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32", "uint256"],
            [eosBlockchain, eosAddress, REWARDS_MAX_LOCK_LIMIT]);

        const Bridge = await ethers.getContractFactory('Bridge');
        bridge = await Bridge.deploy(
            MAX_LOCK_LIMIT,
            MAX_RELEASE_LIMIT,
            MIN_LIMIT,
            LIMIT_INC_PER_BLOCK,
            MIN_REQUIRED_REPORTS,
            commissionAmount,
            sendRewardsStruct,
            bbsToken.address);

        const RewardsSender = await ethers.getContractFactory('RewardsSender');
        rewardsSender = await RewardsSender.deploy(bbsToken.address, bridge.address);
        accounts = await ethers.getSigners();
    });

    it('bbs spending allowence for bridge', async() => {
        expect((await bbsToken.allowance(rewardsSender.address, bridge.address))).
            to.equal(ethers.BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
    });

    it('send rewards', async() => {
        const rewardsAmount = ethers.utils.parseEther(`100`);
        await bbsToken.mint(rewardsSender.address, rewardsAmount);
        expect((await bbsToken.balanceOf(bridge.address))).to.equal(0);
        expect((await bbsToken.balanceOf(rewardsSender.address))).to.equal(rewardsAmount);
        await expect(rewardsSender.sendRewards()).
            to.emit(bridge, 'TokensLock').
                and.to.emit(bridge, 'XTransfer').
                and.to.emit(bridge, 'RewardsSent');
        expect((await bbsToken.balanceOf(rewardsSender.address))).to.equal(0);
        expect((await bbsToken.balanceOf(bridge.address))).to.equal(rewardsAmount);
    });
});