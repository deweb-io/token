// SPDX-License-Identifier: MIT
// BBS staking rewards program.
// Token holders lock transfer approved tokens until the end of the current quarter plus 0 to 12 additional quarters.
// Rewards are divided pro-rata, with a 25% boost given for every locked quarter beyond the current one.
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Staking is Initializable, OwnableUpgradeable {
    IERC20 bbsToken;

    uint256 public constant QUARTER_LENGTH = 91 days;

    // This has nothing to do with decimals, it's just a precision multiplier to minimize dust.
    uint256 public constant PRECISION = 10**18;

    uint256 public nextQuarterStart;
    uint16 public currentQuarter;

    struct Quarter {
        uint256 shares;
        uint256 reward;
    }

    struct Stake {
        uint256 amount;
        uint256 lockTime;
        uint16 lockQuarter;
        uint16 unlockQuarter;
        uint16 earliestUnclaimedQuarter;
    }

    mapping(uint16 => Quarter) public quarters;
    mapping(address => Stake[]) public stakes;
    mapping(address => mapping(uint16 => uint256)[]) public shares;

    event QuarterPromoted(uint16 quarterIdx);
    event RewardDeclared(uint16 quarterIdx, uint256 amount, uint256 totalAmount);
    event StakeLocked(uint256 amount, uint16 unlockQuarter, address staker, bool isNew);
    event RewardsClaimed(uint256 amount, address staker);

    /**
     * @dev Initializer function.
     * @param _bbsToken The address of the BBS token contract.
     */
    function initialize(IERC20 _bbsToken) public initializer {
        __Ownable_init();
        bbsToken = _bbsToken;
        currentQuarter = 0;
        nextQuarterStart = block.timestamp + QUARTER_LENGTH;
    }

    /**
     * @dev Get the number of stakes for an address (automatic getters require the index of the stake).
     * @param staker The address of the staker.
     */
    function getNumOfStakes(address staker) public view returns(uint256 numOfStakes) {
        return stakes[staker].length;
    }

    /**
     * @dev Get the total number of shares for an address on a quarter (sum of all its stakes).
     * @param staker The address of the staker.
     * @param quarterIdx The index of the quarter a reward is declared for.
     */
    function getTotalShares(address staker, uint16 quarterIdx) public view returns(uint256 numOfShares) {
        for (uint16 stakeIdx = 0; stakeIdx < getNumOfStakes(staker); stakeIdx++) {
            numOfShares += shares[staker][stakeIdx][quarterIdx];
        }
    }

    /**
     * @dev Get the voting power of an address, which is currently defined as the number of shares for next quarter.
     * Mostly here for Snapshot integration.
     * @param voter The address of the voter.
     */
    function getVotingPower(address voter) external view returns(uint256 votingPower) {
        return getTotalShares(voter, currentQuarter + 1);
    }

    /**
     * @dev Declare a reward for a quarter by transferring (approved) tokens to the contract.
     * @param quarterIdx The index of the quarter a reward is declared for.
     * @param amount The amount of tokens in the reward - must have sufficient allowance.
     */
    function declareReward(uint16 quarterIdx, uint256 amount) external {
        require(quarterIdx >= currentQuarter, "can not declare rewards for past quarters");
        bbsToken.transferFrom(msg.sender, address(this), amount);
        quarters[quarterIdx].reward += amount;
        emit RewardDeclared(quarterIdx, amount, quarters[quarterIdx].reward);
    }

    /**
     * @dev Promote the current quarter if a quarter ended and has a reward.
     */
    function promoteQuarter() public {
        require(block.timestamp >= nextQuarterStart, "current quarter is not yet over");
        require(quarters[currentQuarter].reward > 0, "current quarter has no reward");
        currentQuarter++;
        nextQuarterStart += QUARTER_LENGTH;
        emit QuarterPromoted(currentQuarter);
    }

    /**
     * @dev Update the shares of a stake.
     * @param staker The address of the staker.
     * @param stakeIdx The index of the stake for that staker.
     */
    function updateShare(address staker, uint16 stakeIdx) internal {
        Stake memory stake = stakes[staker][stakeIdx];
        for (uint16 quarterIdx = currentQuarter; quarterIdx < stake.unlockQuarter; quarterIdx++) {
            uint256 oldShare = shares[staker][stakeIdx][quarterIdx];
            uint256 newShare = stake.amount * (100 + ((stake.unlockQuarter - quarterIdx - 1) * 25));

            // For the quarter in which the stake was locked, we reduce the share amount
            // to reflect the part of the quarter that has already passed.
            // Note that this only happens when quarterIdx == currentQuarter.
            if (quarterIdx == stake.lockQuarter) {
                newShare = newShare * (nextQuarterStart - stake.lockTime) / QUARTER_LENGTH;
            }

            shares[staker][stakeIdx][quarterIdx] = newShare;
            quarters[quarterIdx].shares += newShare - oldShare;
        }
    }

    /**
     * @dev Calculate the unclaimed rewards a stake deserves and mark them as claimed.
     * @param staker The address of the staker.
     * @param stakeIdx The index of the stake for that staker.
     */
    function getRewards(address staker, uint16 stakeIdx) internal returns(uint256 amount) {
        for (
            uint16 quarterIdx = stakes[staker][stakeIdx].earliestUnclaimedQuarter;
            quarterIdx < currentQuarter && quarterIdx < stakes[staker][stakeIdx].unlockQuarter;
            quarterIdx++
        ) {
            amount +=
                PRECISION *
                shares[staker][stakeIdx][quarterIdx] *
                quarters[quarterIdx].reward /
                quarters[quarterIdx].shares;
            shares[staker][stakeIdx][quarterIdx] = 0;
        }

        stakes[staker][stakeIdx].earliestUnclaimedQuarter = currentQuarter;

        return amount / PRECISION;
    }

    /**
     * @dev Require currentQuarter to be valid.
     */
    function validateCurrentQuarter() internal view {
        require(block.timestamp < nextQuarterStart, "quarter must be promoted");
    }

    /**
     * @dev Require a valid unlock quarter, which also requires currentQuarter to be valid.
     * @param unlockQuarter Quarter in which a stake will unlock.
     */
    function validateUnlockQuarter(uint16 unlockQuarter) internal view {
        validateCurrentQuarter();
        require(unlockQuarter > currentQuarter, "can not lock for less than one quarter");
        require(unlockQuarter - currentQuarter <= 13, "can not lock for more than 13 quarters");
    }

    /**
     * @dev Lock a stake of tokens.
     * @param amount Amount of tokens to lock.
     * @param unlockQuarter The index of the quarter the stake unlocks on.
     */
    function lock(uint256 amount, uint16 unlockQuarter) external {
        validateUnlockQuarter(unlockQuarter);
        bbsToken.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].push(Stake(amount, block.timestamp, currentQuarter, unlockQuarter, currentQuarter));
        shares[msg.sender].push();
        updateShare(msg.sender, uint16(stakes[msg.sender].length - 1));
        emit StakeLocked(amount, unlockQuarter, msg.sender, true);
    }

    /**
     * @dev Extend the lock of an existing stake.
     * @param stakeIdx The index of the stake to be extended.
     * @param unlockQuarter The index of the new quarter the lock ends on.
     */
    function extend(uint16 stakeIdx, uint16 unlockQuarter) external {
        validateUnlockQuarter(unlockQuarter);
        require(unlockQuarter > stakes[msg.sender][stakeIdx].unlockQuarter, "must extend beyond current end quarter");
        stakes[msg.sender][stakeIdx].unlockQuarter = unlockQuarter;
        updateShare(msg.sender, stakeIdx);
        emit StakeLocked(stakes[msg.sender][stakeIdx].amount, unlockQuarter, msg.sender, false);
    }

    /**
     * @dev Add the rewards of a stake to the locked amount.
     * @param stakeIdx The index of the stake to be restaked.
     */
    function lockRewards(uint16 stakeIdx) external {
        validateUnlockQuarter(stakes[msg.sender][stakeIdx].unlockQuarter);
        uint256 rewards = getRewards(msg.sender, stakeIdx);
        require(rewards > 0, "no rewards to lock");
        stakes[msg.sender][stakeIdx].amount += rewards;
        updateShare(msg.sender, stakeIdx);
        emit StakeLocked(rewards, stakes[msg.sender][stakeIdx].unlockQuarter, msg.sender, false);
    }

    /**
     * @dev Claim rewards for a stake, and the locked amount if the stake is no longer locked.
     * @param stakeIdx The index of the stake to be claimed.
     */
    function claim(uint16 stakeIdx) external {
        validateCurrentQuarter();
        uint256 claimAmount = getRewards(msg.sender, stakeIdx);
        if (stakes[msg.sender][stakeIdx].unlockQuarter <= currentQuarter) {
            claimAmount += stakes[msg.sender][stakeIdx].amount;
            stakes[msg.sender][stakeIdx].amount = 0;
        }
        require(claimAmount > 0, "nothing to claim");
        bbsToken.transfer(msg.sender, claimAmount);
        emit RewardsClaimed(claimAmount, msg.sender);
    }
}
