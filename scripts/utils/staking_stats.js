const fs = require('fs');
const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;

const STACKING_ADDRESS = common.getStakingAddress();

const getEvents = async() => (
    await hardhat.ethers.getContractFactory('StakingUpgrade1')
).attach(STACKING_ADDRESS).queryFilter('*', 0, 'latest');

const getCachedEvents = async() => {
    const cachePath = './stakingStats.json';
    if(!fs.existsSync(cachePath)) {
        const events = await getEvents();
        await fs.writeFileSync(cachePath, JSON.stringify(events, null, 4));
        log(`Wrote ${events.length} events to ${cachePath}`);
        return events;
    } else {
        const events = JSON.parse(await fs.readFileSync(cachePath, 'utf8'));
        log(`Read ${events.length} events from ${cachePath}`);
        return events;
    }
};

const analyzeEvents = async(events) => {
    const stakingJson = './artifacts/contracts/StakingUpgrade1.sol/StakingUpgrade1.json';
    const abi = JSON.parse(await fs.readFileSync(stakingJson, 'utf8')).abi;
    const interface = new hardhat.ethers.utils.Interface(abi);

    // A dictionary with default values, the JS way (puke).
    const aggregatedResults = new Proxy({}, {get(target, prop) {
        return target[prop] ? target[prop] : target[prop] = {
            staked: hardhat.ethers.BigNumber.from(0),
            released: hardhat.ethers.BigNumber.from(0),
            rewarded: hardhat.ethers.BigNumber.from(0),
            claimed: hardhat.ethers.BigNumber.from(0)
        };
    }});
    let currentQuarter = 0;
    for(const event of events) {
        try {
            event.args = interface.parseLog(event).args;
        } catch(error) {
            console.warn(`Failed to parse event: ${JSON.stringify(event)}`);
            continue;
        }

        if(event.event === 'QuarterPromoted') {
            currentQuarter = event.args.quarterIdx;

        } else if(event.args.amount) {
            if(event.event === 'RewardDeclared') {
                aggregatedResults[event.args.quarterIdx + 1].rewarded =
                    aggregatedResults[event.args.quarterIdx + 1].rewarded.add(event.args.amount);
            } else if(event.event === 'RewardsClaimed') {
                aggregatedResults[currentQuarter].claimed =
                    aggregatedResults[currentQuarter].claimed.add(event.args.amount).add(event.args.stakeAmount);
            } else if(event.event === 'StakeLocked') {
                // Standard lock.
                if(event.args.originalAmount === '0') {
                    aggregatedResults[currentQuarter].staked =
                        aggregatedResults[currentQuarter].staked.add(event.args.amount);
                    aggregatedResults[event.args.unlockQuarter].released =
                        aggregatedResults[event.args.unlockQuarter].released.add(event.args.amount);
                } else {
                    // Extended lock.
                    if(event.args.originalUnlockQuarter < event.args.unlockQuarter) {
                        aggregatedResults[event.args.unlockQuarter].released =
                            aggregatedResults[event.args.unlockQuarter].released.add(event.args.amount);
                        aggregatedResults[event.args.originalUnlockQuarter].released =
                            aggregatedResults[event.args.originalUnlockQuarter].released.sub(event.args.amount);
                    }
                }
            }
        }
    }
    return aggregatedResults;
};

async function main() {
    log('---Calculating Staking Stats---');
    const events = await analyzeEvents(await getCachedEvents());
    console.log('quarter, staked, released, rewarded, claimed');
    const fromWei = hardhat.ethers.utils.formatEther;
    for(const [quarter, {staked, released, rewarded, claimed}] of Object.entries(events)) {
        console.log(`${quarter}, ${fromWei(staked)}, ${fromWei(released)}, ${fromWei(rewarded)}, ${fromWei(claimed)}`);
    }
    log('---Staking Stats Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
