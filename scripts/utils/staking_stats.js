const fs = require('fs');
const crypto = require('crypto');
const hardhat = require('hardhat');
const common = require('../common/common');

const TOKEN_NAME = 'BBSToken';
const TOKEN_ADDRESS = common.getBBStokenAddress();
const STAKING_NAME = 'StakingUpgrade1';
const STAKING_ADDRESS = common.getStakingAddress();

const getContract = async(name, address) => (await hardhat.ethers.getContractFactory(name)).attach(address);

const getEvents = async(contract, filter) => (await contract.queryFilter(filter, 0, 'latest'));

// Get events with file caching, keys by contract and filter.
const getCachedEvents = async(contract, filter) => {
    const filterId = crypto.createHash('md5').update(JSON.stringify(filter)).digest('hex');
    const cachePath = `./${contract.address}_${filterId}.json`;
    let events;
    if(!fs.existsSync(cachePath)) {
        events = await getEvents(contract, filter);
        await fs.writeFileSync(cachePath, JSON.stringify(events, null, 4));
        console.warn(`Wrote ${events.length} events to ${cachePath}`);
    } else {
        events = JSON.parse(await fs.readFileSync(cachePath, 'utf8'));
        console.warn(`Read ${events.length} events from ${cachePath}`);
    }
    return events;
};

// Map events by transaction hash, and error on duplicates.
const mapEventsByTx = (events) => events.reduce((mapping, event) => {
    if(mapping[event.transactionHash]) {
        console.error(`Duplicate event for tx ${event.transactionHash}`);
        process.exit(1);
    }
    mapping[event.transactionHash] = event;
    return mapping;
}, {});

// Get all BBS transfers to and from the staking contract, so we can match them up with the staking events.
const getStakingTransfers = async() => {
    const tokenContract = await getContract(TOKEN_NAME, TOKEN_ADDRESS);
    return [
        await getCachedEvents(tokenContract, tokenContract.filters.Transfer(null, STAKING_ADDRESS)),
        await getCachedEvents(tokenContract, tokenContract.filters.Transfer(STAKING_ADDRESS, null))
    ].map(mapEventsByTx);
};

const analyzeStakingEvents = async() => {
    const [transfersToStaking, transfersFromStaking] = await getStakingTransfers();
    const stakingContract = await getContract(STAKING_NAME, STAKING_ADDRESS);
    const stakingEvents = await getCachedEvents(stakingContract, '*');

    // Default dictionaries, the JS way (puke).
    const quarters = new Proxy({}, {get(target, prop) {
        return target[prop] ? target[prop] : target[prop] = {
            staked: hardhat.ethers.BigNumber.from(0),
            restaked: hardhat.ethers.BigNumber.from(0),
            released: hardhat.ethers.BigNumber.from(0),
            rewarded: hardhat.ethers.BigNumber.from(0),
            claimed: hardhat.ethers.BigNumber.from(0)
        };
    }});

    // Go over staking events, match them with transfers (erroring on mismatches) and aggregate quarter stats.
    let currentQuarter = 0;
    for(const stakingEvent of stakingEvents) {
        if(!stakingEvent.event) {
            console.warn(
                `Failed to parse stakingEvent in ${stakingEvent.transactionHash}` +
                ' - this is normal for base solidity events'
            );
            continue;
        }
        if(stakingEvent.event === 'QuarterPromoted') {
            currentQuarter = stakingEvent.args[0];

        } else if(stakingEvent.event === 'RewardDeclared') {
            const rewardAmount = ethers.BigNumber.from(stakingEvent.args[1]);
            const transferAmount = ethers.BigNumber.from(transfersToStaking[stakingEvent.transactionHash].args[2]);
            if(!rewardAmount.eq(transferAmount)) {
                console.error(`RewardDeclared amount mismatch: ${stakingEvent.transactionHash}`);
                process.exit(1);
            }
            delete transfersToStaking[stakingEvent.transactionHash];
            quarters[stakingEvent.args[0] + 1].rewarded = quarters[stakingEvent.args[0] + 1].rewarded.add(rewardAmount);

        } else if(stakingEvent.event === 'StakeLocked') {
            const stakeAmount = ethers.BigNumber.from(stakingEvent.args[2]);

            // Ordinary stake.
            if(stakingEvent.args[5] === 0) {
                const transferAmount = ethers.BigNumber.from(transfersToStaking[stakingEvent.transactionHash].args[2]);
                if(!stakeAmount.eq(transferAmount)) {
                    console.error(`StakeLocked amount mismatch: ${stakingEvent.transactionHash}`);
                    process.exit(1);
                }
                delete transfersToStaking[stakingEvent.transactionHash];

                quarters[currentQuarter].staked = quarters[currentQuarter].staked.add(stakeAmount);
                quarters[stakingEvent.args[3]].released = quarters[stakingEvent.args[3]].released.add(stakeAmount);

            // Extended existing lock.
            } else if(stakingEvent.args[5] < stakingEvent.args[3]) {
                quarters[stakingEvent.args[5]].released = quarters[stakingEvent.args[5]].released.sub(stakeAmount);
                quarters[stakingEvent.args[3]].released = quarters[stakingEvent.args[3]].released.add(stakeAmount);

            // Restake.
            } else {
                const restakeAmount = stakeAmount.sub(stakingEvent.args[4]);
                if(!restakeAmount.gt(0)) {
                    console.error(`Restake is not greater than stake: ${stakingEvent.transactionHash}`);
                    process.exit(1);
                }
                quarters[currentQuarter].restaked = quarters[currentQuarter].restaked.add(restakeAmount);
                quarters[stakingEvent.args[3]].released = quarters[stakingEvent.args[3]].released.add(restakeAmount);
            }

        } else if(stakingEvent.event === 'RewardsClaimed') {
            const claimAmount = ethers.BigNumber.from(stakingEvent.args[2]);
            const transferAmount = ethers.BigNumber.from(transfersFromStaking[stakingEvent.transactionHash].args[2]);
            if(!claimAmount.eq(transferAmount)) {
                console.error(`RewardsClaimed amount mismatch: ${stakingEvent.transactionHash}`);
                process.exit(1);
            }
            delete transfersFromStaking[stakingEvent.transactionHash];

            quarters[currentQuarter].claimed = quarters[currentQuarter].claimed.add(claimAmount);
        }
    }
    return [quarters, transfersToStaking, transfersFromStaking];
};

async function main() {
    const [quarters, extraTo, extraFrom] = await analyzeStakingEvents();

    console.log('quarter, staked, rewarded, restaked, released, claimed');
    for(let [quarter, {staked, rewarded, restaked, released, claimed}] of Object.entries(quarters)) {
        [staked, rewarded, restaked, released, claimed] = [staked, rewarded, restaked, released, claimed].map(
            hardhat.ethers.utils.formatEther
        );
        console.log(`${quarter}, ${staked}, ${rewarded}, ${restaked}, ${released}, ${claimed}`);
    }

    // Warn about any transfers that we couldn't match up with staking events.
    if(Object.keys(extraTo).length > 0) {
        console.warn('Extra transfers to staking contract:');
        console.warn(extraTo);
    }
    if(Object.keys(extraFrom).length > 0) {
        console.warn('Extra transfers from staking contract:');
        console.warn(extraFrom);
    }
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
