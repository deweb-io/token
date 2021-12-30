/**
 * Test deployment script.
 * This script needs to be run from root (/token) directory.
 *
 * Please run hardhat local node ('npx hardhat node') before running:
 * npx hardhat test --network localhost scripts/tests/deployment_test.js
 *
 * Tests are separated but depend on each other.
 */

const hardhat = require('hardhat');
const {expect} = require('chai');
const {exec} = require('child_process');
const {ethers} = require('ethers');
const config = require('../deployment/config.js');
const common = require('../common/common');
const {getSigner} = require('../utils/utils');

const NETWORK = 'localhost';
const SCRIPTS_PATH = './scripts/deployment';
const DELAY_MS = 6000;

// Bridge
const XTRANSFER_AMOUNT = '100';

// Commands
const CLEAN = 'rm -rf ./artifacts/ ./scripts/common/artifacts/';
const COMPILE= 'npx hardhat compile';
const DEPLOY_TOKEN = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/deploy_token.js`;
const DEPLOY_STAKING = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/deploy_staking.js`;
const DEPLOY_BRIDGE = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/deploy_bridge.js`;
const DEPLOY_DAILY_REWARDS = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/deploy_daily_rewards.js`;
const DEPLOY_REWARDS_SENDER = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/deploy_rewards_sender.js`;
const MINT = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/mint.js`;
const SET_REPORTERS = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/bridge_set_reporters.js`;
const DECLARE_REWARDS = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/declare_rewards.js`;
const XTRANSFER_ETH_TO_EOS = `RECEIVER_EOS_ACCOUNT=accountoneos BBS_AMOUNT=${XTRANSFER_AMOUNT} npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/xtransfer_eth_to_eos.js`;
const TRANSFER_OWNERSHIP_BBS = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/transfer_ownership_bbs.js`;
const TRANSFER_OWNERSHIP_STAKING = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/transfer_ownership_staking.js`;
const TRANSFER_OWNERSHIP_BRIDGE = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/transfer_ownership_bridge.js`;
const TRANSFER_OWNERSHIP_DAILY_REWARDS = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/transfer_ownership_daily_rewards.js`;
const DAILY_REWARDS_DECLARE = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/daily_rewards_declare_rewards.js`;
const DAILY_REWARDS_SET = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/daily_rewards_set_rewards.js`;
const DAILY_REWARDS_DISTRIBUTE = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/daily_rewards_distribute_rewards.js`;
const SEND_REWARDS = `npx hardhat run --network ${NETWORK} ${SCRIPTS_PATH}/send_rewards.js`;

describe('Deployment test', () => {
    function execute(action) {
        console.log(`command: ${action}`);
        exec(action, (error, stdout, stderr) => {
            if (error) throw new Error(error);
            if (stderr) throw new Error(stderr);
        });
    }

    function wait(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {resolve(ms);}, ms);
        });
    }

    async function getBBSToken() {
        const Token = await hardhat.ethers.getContractFactory('BBSToken');
        return Token.attach(common.getBBStokenAddress());
    }

    async function getBridge() {
        const Bridge = await hardhat.ethers.getContractFactory('Bridge');
        return Bridge.attach(common.getBridgeAddress());
    }

    before(async () => {
        execute(CLEAN);
        await wait(DELAY_MS);

        execute(COMPILE);
        await wait(DELAY_MS * 2);
    });

    it('BBS: deploy, mint, transfer ownership', async() => {
        execute(DEPLOY_TOKEN);
        await wait(DELAY_MS);

        execute(MINT);
        await wait(DELAY_MS);

        execute(TRANSFER_OWNERSHIP_BBS);
        await wait(DELAY_MS);

        const signer = await getSigner();
        const bbsToken = await getBBSToken();
        expect((await bbsToken.name())).to.equal('BBS');
        expect((await bbsToken.balanceOf(signer.address)).toString()).to.equal(
            ethers.utils.parseEther(`${config.mint.totalSupply}`).toString());
        expect((await bbsToken.owner()).toLowerCase()).to.equal(config.safe.address.toLowerCase());
    }).timeout(100000000000);

    it('Staking: deploy, decalre rewards, transfer ownership', async()=> {
        execute(DEPLOY_STAKING);
        await wait(DELAY_MS);

        const Staking = await hardhat.ethers.getContractFactory('Staking');
        const staking = Staking.attach(common.getStakingAddress());

        // declare rewards
        for (const quarter of config.rewards) {
            execute(`QUARTER_INDEX=${quarter.q} ${DECLARE_REWARDS}`);
            await wait(DELAY_MS);
        }

        execute(TRANSFER_OWNERSHIP_STAKING);
        await wait(DELAY_MS);

        for (const quarter of config.rewards) {
            expect((await staking.quarters(quarter.q)).reward.toString()).to.equal(
                ethers.utils.parseEther(quarter.amount).toString());
        }
        expect((await staking.owner()).toLowerCase()).to.equal(config.safe.address.toLowerCase());
    }).timeout(100000000000);


    it('Bridge: deploy, set reporters, xtransfer, transfer ownership', async()=> {
        execute(DEPLOY_BRIDGE);
        await wait(DELAY_MS);

        const bridge = await getBridge();

        execute(SET_REPORTERS);
        await wait(DELAY_MS);

        execute(TRANSFER_OWNERSHIP_BRIDGE);
        await wait(DELAY_MS);

        // lock bbs-bounties
        execute(XTRANSFER_ETH_TO_EOS);
        await wait(DELAY_MS);

        expect((await bridge.maxLockLimit())).to.equal(ethers.utils.parseEther(config.bridge.maxLockLimit));
        expect((await bridge.maxReleaseLimit())).to.equal(ethers.utils.parseEther(config.bridge.maxReleaseLimit));
        expect((await bridge.minLimit())).to.equal(ethers.utils.parseEther(config.bridge.minLimit));
        expect((await bridge.limitIncPerBlock())).to.equal(ethers.utils.parseEther(config.bridge.limitIncPerBlock));
        expect((await bridge.minRequiredReports())).to.equal(config.bridge.minRequiredReports);
        expect((await bridge.commissionAmount())).to.equal(ethers.utils.parseEther(config.bridge.commissionAmount));
        expect((await bridge.sendRewardsMaxLockLimit())).to.equal(ethers.utils.parseEther(config.bridge.sendRewards.maxLockLimit));
        expect((await bridge.sendRewardsToBlockchain()).toString()).to.equal(
            ethers.utils.formatBytes32String(config.bridge.sendRewards.toBlockchain).toString());
        expect((await bridge.sendRewardsToAccount()).toString()).to.equal(
            ethers.utils.formatBytes32String(config.bridge.sendRewards.toAccount).toString());
        expect(await bridge.token()).to.equal(common.getBBStokenAddress());

        for (const reporter of config.bridge.reporters.addresses) {
            expect(await bridge.reporters(reporter)).to.equal(true);
        }

        const bbsToken = await getBBSToken();
        expect((await bbsToken.balanceOf(bridge.address)).toString()).
            to.equal(ethers.utils.parseEther(`${XTRANSFER_AMOUNT}`).toString());

        expect((await bridge.owner()).toLowerCase()).to.equal((config.safe.address.toLowerCase()));
    }).timeout(100000000000);

    it('DailyRewards & RewardsSender: deploy, declare, set, distribute, transfer ownership', async() => {
        execute(DEPLOY_DAILY_REWARDS);
        await wait(DELAY_MS);
        const DailyRewards = await hardhat.ethers.getContractFactory('DailyRewards');
        const dailyRewards = DailyRewards.attach(common.getDailyRewardsAddress());

        execute(DEPLOY_REWARDS_SENDER);
        await wait(DELAY_MS);

        execute(DAILY_REWARDS_DECLARE);
        await wait(DELAY_MS);
        const declaredRewards = await dailyRewards.declaredRewards(0);
        expect(declaredRewards[0]).to.equal(common.getRewardsSenderAddress());
        expect(declaredRewards[1]).to.equal(hardhat.ethers.utils.parseEther(config.dailyRewards.amount));

        await network.provider.send('evm_increaseTime', [(await dailyRewards.DECLARATION_INTERVAL()).toNumber()]);
        await network.provider.send('evm_mine');

        execute(DAILY_REWARDS_SET);
        await wait(DELAY_MS);
        const rewards = await dailyRewards.rewards(0);
        expect(rewards[0]).to.equal(common.getRewardsSenderAddress());
        expect(rewards[1]).to.equal(hardhat.ethers.utils.parseEther(config.dailyRewards.amount));

        // transfer ownership
        execute(TRANSFER_OWNERSHIP_DAILY_REWARDS);
        await wait(DELAY_MS);

        // transfer BBS tokens to dailyRewards for distribution
        const bbsToken = await getBBSToken();
        await bbsToken.transfer(dailyRewards.address, hardhat.ethers.utils.parseEther('100000'));
        await wait(DELAY_MS);

        // check balance before distribute
        expect((await bbsToken.balanceOf(common.getRewardsSenderAddress()))).to.equal(0);

        // distribute tokens from DailyRewards to beneficaries
        execute(DAILY_REWARDS_DISTRIBUTE);
        await wait(DELAY_MS);

        // check balance after distribute of daily rewards
        expect((await bbsToken.balanceOf(common.getRewardsSenderAddress()))).to.equal(hardhat.ethers.utils.parseEther(config.dailyRewards.amount));

        // send rewards from RewardsSender (to bridge)
        const bridge = await getBridge();

        execute(SEND_REWARDS);
        await wait(DELAY_MS);

        expect((await bbsToken.balanceOf(common.getRewardsSenderAddress()))).to.equal(0);

        // bridge balance now includes both bbs-rewards and bbs-bounties
        expect((await bbsToken.balanceOf(bridge.address))).to.equal(
            (ethers.utils.parseEther(config.dailyRewards.amount).add(
                ethers.utils.parseEther(`${XTRANSFER_AMOUNT}`))));

        expect((await dailyRewards.owner()).toLowerCase()).
            to.equal(config.safe.address.toLowerCase());
    }).timeout(100000000000);
});
