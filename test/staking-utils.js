/* Utilities for our staking tests. */
const {expect} = require('chai');
const {signPermit} = require('../scripts/utils/utils');
const { network } = require('hardhat');

const deadline = 9999999999;
let owner, stakers, bbsToken, staking, quarterLength, tokenName;

const initStaking = async () => {
    const BBSToken = await ethers.getContractFactory('BBSToken');
    const Staking = await ethers.getContractFactory('Staking');
    bbsToken = await BBSToken.deploy();
    staking = await upgrades.deployProxy(Staking, [bbsToken.address]);
    tokenName = await bbsToken.name();
    quarterLength = (await staking.QUARTER_LENGTH()).toNumber();
    [owner, ...stakers] = await ethers.getSigners();
};

const getTime = async () => {
    await network.provider.send('evm_mine');
    const stakingQuarter = await staking.currentQuarter();
    const nextQuarterStart = (await staking.nextQuarterStart()).toNumber();
    const currentTime = ethers.BigNumber.from(
        (await network.provider.send('eth_getBlockByNumber', ['latest', false])).timestamp).toNumber();
    const realQuarter = stakingQuarter + (1 - ((nextQuarterStart - currentTime) / quarterLength));
    return {
        realQuarter: realQuarter,
        currentTime: currentTime,
        nextQuarterStart: nextQuarterStart,
        stakingQuarter: stakingQuarter
    };
};

const increaseTimeTo = async(quarterIdx) => {
    let {realQuarter, currentTime, nextQuarterStart} = await getTime();

    if(realQuarter > quarterIdx) throw(`can not increase time from ${realQuarter} to ${quarterIdx}`);

    await network.provider.send('evm_increaseTime', [(quarterIdx - realQuarter) * quarterLength]);
    await network.provider.send('evm_mine');
    currentTime = (await getTime()).currentTime;
    while(currentTime >= nextQuarterStart){
        await staking.promoteQuarter();
        nextQuarterStart = await staking.nextQuarterStart();
    }

    realQuarter = (await getTime()).realQuarter;
    console.debug(`current quarter it is now ${realQuarter} (${quarterIdx} requested)`);
};

const mintAndDoAs = async (signer, amount) => {
    await bbsToken.mint(signer.address, amount);
    return staking.connect(signer);
};

const declareReward = async (quartersIdx, rewardAmount) => {
    for(const quarterIdx of quartersIdx){
        const {v, r, s} = await signPermit(owner, staking.address, rewardAmount, deadline, bbsToken, tokenName);
        await (await mintAndDoAs(owner, rewardAmount)).declareReward(
            quarterIdx, rewardAmount, owner.address, deadline, v, r, s);
        console.debug(`reward of ${rewardAmount} was declared for quarter ${quarterIdx}`);
    }
};

const lock = async (staker, amount, unlockQuarter) => {
    const {v, r, s} = await signPermit(staker, staking.address, amount, deadline, bbsToken, tokenName);
    await (await mintAndDoAs(staker, amount)).lock(amount, unlockQuarter, staker.address, deadline, v, r, s);
    console.debug(`locked ${amount} tokens until ${unlockQuarter} for ${staker.address.slice(0, 5)}`);
};

const extend = async (staker, stakeIdx, unlockQuarter, assertSharesEqual) => {
    await staking.connect(staker).extend(stakeIdx, unlockQuarter);
    const shares = (await staking.shares(staker.address, stakeIdx, await staking.currentQuarter())).toNumber();
    if(typeof(assertSharesEqual) === typeof(1)) expect(shares).to.equal(assertSharesEqual);
    console.debug(`extended ${staker.address.slice(0, 5)}/${stakeIdx} until ${unlockQuarter}, current shares are ${shares}`);
};

const lockRewards = async (staker, stakeIdx, assertStakeIncreaseEquals) => {
    const startingAmount = (await staking.stakes(staker.address, stakeIdx)).amount;
    await staking.connect(staker).lockRewards(stakeIdx);
    const stakeChange = (await staking.stakes(staker.address, stakeIdx)).amount - startingAmount;
    if(typeof(assertStakeIncreaseEquals) === typeof(1)) expect(stakeChange).to.equal(assertStakeIncreaseEquals);
    console.debug(`restaked ${staker.address.slice(0, 5)}/${stakeIdx} for an added ${stakeChange}`);
};

const getBalance = async(staker) => {
    return (await bbsToken.balanceOf(staker.address)).toNumber();
};

const claim = async (staker, stakeIdx, assertClaimEquals) => {
    const startingBalance = await getBalance(staker);
    await staking.connect(staker).claim(stakeIdx);
    const claimAmount = (await getBalance(staker)) - startingBalance;
    if(typeof(assertClaimEquals) === typeof(1)) expect(claimAmount).to.equal(assertClaimEquals);
    console.debug(`claimed ${staker.address.slice(0, 5)}/${stakeIdx} and got ${claimAmount}`);
    return claimAmount;
};

const runScenario = async (steps) => {
    const functions = {
        declareReward: async(step) => await declareReward(step.quartersIdx, step.amount),
        lock: async(step) => await lock(step.staker, step.amount, step.unlockQuarter),
        increaseTimeTo: async(step) => await increaseTimeTo(step.quarterIdx),
        extend: async(step) => await extend(step.staker, step.stakeIdx, step.unlockQuarter, step.assertSharesEqual),
        lockRewards: async(step) => await lockRewards(step.staker, step.stakeIdx, step.assertStakeIncreaseEquals),
        claim: async(step) => await claim(step.staker, step.stakeIdx, step.assertClaimEquals)
    };
    const names = {
        alice: stakers[0],
        bob: stakers[1],
        carol: stakers[2],
        tal: stakers[3]
    };
    for(const [stepIdx, step] of steps.entries()){
        console.debug(`running step ${stepIdx} - ${step.action}`);
        if(!(step.action in functions)) throw(`unknown action ${step.action}`);
        if('staker' in step) step.staker = names[step.staker];
        await functions[step.action](step);
    }
};

const getStakers = () => {
    return stakers;
};

const getOwner = () => {
    return owner;
};

const getBBSTokenAddress = () => {
    return bbsToken.address;
};

const getStakingContractAddress = () => {
    return staking.address;
};

module.exports = {
    initStaking,
    getTime,
    increaseTimeTo,
    mintAndDoAs,
    declareReward,
    lock,
    extend,
    lockRewards,
    getBalance,
    claim,
    runScenario,
    getStakers,
    getOwner,
    getBBSTokenAddress,
    getStakingContractAddress
};