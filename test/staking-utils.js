/* Utilities for our staking tests. */
const {expect} = require('chai');
const {signPermit} = require('../scripts/utils/utils');
const hardhat = require('hardhat');

const deadline = 9999999999;

// Why not const variables which are in utils?
let owner, stakers, bbsToken, staking, substaking, quarterLength, tokenName;

const initStaking = async () => {
    const BBSToken = await ethers.getContractFactory('BBSToken');
    const Staking = await ethers.getContractFactory('Staking');
    bbsToken = await BBSToken.deploy();
    staking = await upgrades.deployProxy(Staking, [bbsToken.address]);
    tokenName = await bbsToken.name();
    quarterLength = (await staking.QUARTER_LENGTH()).toNumber();
    [owner, ...stakers] = await ethers.getSigners();
};

const initSubStaking = async () => {
    const SubStaking = await ethers.getContractFactory('SubStaking');
    const stakingCurrentQuarter = await staking.currentQuarter();
    const stakingNextQuarterStart = await staking.nextQuarterStart();
    substaking = await upgrades.deployProxy(
        SubStaking,
        [bbsToken.address, stakingCurrentQuarter, hardhat.ethers.BigNumber.from(stakingNextQuarterStart.add(14*60*60*24))]);
}

const getTime = async () => {
    await hardhat.network.provider.send('evm_mine');
    const stakingQuarter = await staking.currentQuarter();
    const nextQuarterStart = (await staking.nextQuarterStart()).toNumber();
    const currentTime = ethers.BigNumber.from(
        (await hardhat.network.provider.send('eth_getBlockByNumber', ['latest', false])).timestamp).toNumber();
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

    await hardhat.network.provider.send('evm_increaseTime', [(quarterIdx - realQuarter) * quarterLength]);
    await hardhat.network.provider.send('evm_mine');
    currentTime = (await getTime()).currentTime;
    while(currentTime >= nextQuarterStart){
        await staking.promoteQuarter();
        nextQuarterStart = await staking.nextQuarterStart();
    }

    realQuarter = (await getTime()).realQuarter;
    console.log(`[staking]: current quarter it is now ${realQuarter} (${quarterIdx} requested)`);

    if (substaking) {
        let nextQuarterStart = (await substaking.nextQuarterStart()).toNumber();
        console.log(`[substaking]: nextQuarterStart: ${nextQuarterStart}`);
        console.log(`[substaking]: current quarter: ${await substaking.currentQuarter()}`)
        while(currentTime >= nextQuarterStart){
            await substaking.promoteQuarter();
            nextQuarterStart = await substaking.nextQuarterStart();
            console.log(`[substaking]: current quarter:${await substaking.currentQuarter()}`);
        }
    }
};

const mintAndDoAs = async (signer, amount) => {
    await bbsToken.mint(signer.address, amount);
    return staking.connect(signer);
};

const mintAndDoAsSub = async (signer, amount) => {
    await bbsToken.mint(signer.address, amount);
    return substaking.connect(signer);
};

const declareReward = async (quartersIdx, rewardAmount) => {
    for(const quarterIdx of quartersIdx){
        const {v, r, s} = await signPermit(owner, staking.address, rewardAmount, deadline, bbsToken, tokenName);
        await (await mintAndDoAs(owner, rewardAmount)).declareReward(
            quarterIdx, rewardAmount, deadline, v, r, s);
        console.debug(`[Staking]:reward of ${rewardAmount} was declared for quarter ${quarterIdx}`);
    }
};

const decalreRewardSub = async (quarterId) => {
    const rewardAmount = await bbsToken.balanceOf(owner.address);
    await bbsToken.approve(substaking.address, rewardAmount);
    await substaking.connect(owner)['declareReward(uint16,uint256)'](quarterId, rewardAmount);
    console.log(`[SubStaking]:reward of ${rewardAmount} was declared for quarter ${quarterId}`);
};

const lock = async (staker, amount, unlockQuarter) => {
    const {v, r, s} = await signPermit(staker, staking.address, amount, deadline, bbsToken, tokenName);
    await (await mintAndDoAs(staker, amount)).lock(amount, unlockQuarter, deadline, v, r, s);
    console.debug(`locked ${amount} tokens until ${unlockQuarter} for ${staker.address.slice(0, 5)}`);
};

const lockSub = async (staker, amount, unlockQuarter) => {
    const {v, r, s} = await signPermit(staker, substaking.address, amount, deadline, bbsToken, tokenName);
    await (await mintAndDoAsSub(staker, amount))['lock(uint256,uint16,uint256,uint8,bytes32,bytes32)'](amount, unlockQuarter, deadline, v, r, s);
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

const withdraw = async(amount) => {
    await substaking.withdraw(amount);
    console.debug(`${owner.address} withdrawed ${amount}`);
}

const deposit = async(amount) => {
    await bbsToken.connect(owner).transfer(substaking.address, amount);
    console.debug(`${owner.address} transfered ${amount} to ${substaking.address}`);
}

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

const claimSub = async (staker, stakeIdx, assertClaimEquals) => {
    const startingBalance = await getBalance(staker);
    await substaking.connect(staker).claim(stakeIdx);
    const claimAmount = (await getBalance(staker)) - startingBalance;
    if(typeof(assertClaimEquals) === typeof(1)) expect(claimAmount).to.equal(assertClaimEquals);
    console.debug(`claimed ${staker.address.slice(0, 5)}/${stakeIdx} and got ${claimAmount}`);
    return claimAmount;
};

const runScenario = async (steps) => {
    const functions = {
        declareReward: async(step) => await declareReward(step.quartersIdx, step.amount),
        decalreRewardSub: async(step) => await decalreRewardSub(step.quarterId),
        lock: async(step) => await lock(step.staker, step.amount, step.unlockQuarter),
        lockSub: async(step) => await lockSub(step.staker, step.amount, step.unlockQuarter),
        increaseTimeTo: async(step) => await increaseTimeTo(step.quarterIdx),
        extend: async(step) => await extend(step.staker, step.stakeIdx, step.unlockQuarter, step.assertSharesEqual),
        lockRewards: async(step) => await lockRewards(step.staker, step.stakeIdx, step.assertStakeIncreaseEquals),
        claim: async(step) => await claim(step.staker, step.stakeIdx, step.assertClaimEquals),
        claimSub: async(step) => await claimSub(step.staker, step.stakeIdx, step.assertClaimEquals),
        withdraw: async(step) => await withdraw(step.amount),
        deploySub: async() => await initSubStaking(),
        deposit: async(step) => await deposit(step.amount)
    };
    const names = {
        alice: stakers[0],
        bob: stakers[1],
        carol: stakers[2],
        tal: stakers[3],
        manager: owner,
        binanceStaker1 : stakers[4],
        binanceStaker2 : stakers[5],
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
