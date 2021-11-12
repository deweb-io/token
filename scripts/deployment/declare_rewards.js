const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const STACKING_ADDRESS = common.getStakingAddress();

const QUARTER_INDEX = process.env.QUARTER_INDEX;
const ARTIFACT_FILE = `reward_quarter_${QUARTER_INDEX}_tx.txt`;

let bbsToken;
let networkChainId;

async function signPremitData(signer, spender, value, nonce, deadline) {
    const signature = await signer._signTypedData(
        {name: 'BBS', version: '1', chainId: networkChainId, verifyingContract: bbsToken.address},
        {Permit: [
            {name: 'owner', type: 'address'}, {name: 'spender', type: 'address'},
            {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'},
            {name: 'deadline', type: 'uint256'}
        ]},
        {owner: signer.address, spender, value, nonce, deadline});
    return ethers.utils.splitSignature(signature);
}

async function getNonce(account) {
    return (await bbsToken.nonces(account.address)).toNumber();
}

async function main() {
    log(`---Declare rewards---`);

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting.');

    if (!QUARTER_INDEX)
        throw new Error('No quarter index. aborting');

    const Staking = await hardhat.ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    const rewardConfig = config.rewards.find(reward => reward.q == QUARTER_INDEX);
    const rewardAmountWei = hardhat.ethers.BigNumber.from(hardhat.ethers.utils.parseEther(rewardConfig.amount));
    log(`Required rewards for quarter ${rewardConfig.q} is ${rewardAmountWei} (wei)`);
    const currentRewardWei = (await staking.quarters(QUARTER_INDEX)).reward;
    log(`Current rewards for quarter ${rewardConfig.q} is ${currentRewardWei} (wei)`);

    if (common.artifactExists(ARTIFACT_FILE))
        throw new Error("script already run. aborting.");

    if (currentRewardWei.gt(rewardAmountWei)) {
        throw new Error(`Quarter ${QUARTER_INDEX} already has a BIGGER reward (${currentRewardWei}) then configured ${rewardAmountWei}. aborting.`);
    }

    if (currentRewardWei.eq(rewardAmountWei)) {
        throw new Error(`Quarter ${QUARTER_INDEX} already has a reward: ${currentRewardWei}. aborting.`);
    }

    // calculate reward to be added to quarter
    const rewardToAddWei = rewardAmountWei.sub(currentRewardWei);
    log(`Adding rewards for quarter ${QUARTER_INDEX}, amount (wei): ${rewardToAddWei}`);

    const provider = await (ethers.getDefaultProvider(hardhat.network.config.url));
    const deadline = (await provider.getBlock(await provider.getBlockNumber())).timestamp + 10000000000;
    networkChainId = (await provider.getNetwork()).chainId;

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    bbsToken = Token.attach(BBS_TOKEN_ADDRESS);

    const holder = (await hardhat.ethers.getSigners())[0];
    const nonce = await getNonce(holder);
    const {v, r, s} = await signPremitData(holder, STACKING_ADDRESS, rewardToAddWei, nonce, deadline);
    const tx = await staking.declareReward(QUARTER_INDEX, rewardToAddWei, holder.address, deadline, v, r, s);
    common.etherscanLogTx(tx.hash, tx.chainId);
    common.writeArtifact(ARTIFACT_FILE, JSON.stringify(tx));

    log(`---Declare rewards Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});