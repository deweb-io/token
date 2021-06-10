// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// This is a draft for our staking rewards program.

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Staking is Initializable, OwnableUpgradeable {
    uint256 public constant QUARTER_LENGTH = 91 days;
    uint256 public constant PRECISION = 10**18;

    uint256 public currentQuarterEnd;
    uint16 public currentQuarter;
    IERC20 bbsToken;

    struct Quarter {
        uint256 shares;
        uint256 reward;
    }

    struct Stake {
        uint256 amount;
        uint256 lockTime;
        uint16 lockQuarter;
        uint16 unlockQuarter;
        uint16 firstUnclaimedQuarter;
    }

    mapping(uint16 => Quarter) public quarters;
    mapping(address => Stake[]) public stakes;
    mapping(address => mapping(uint16 => uint256)[]) public shares;

    event QuarterPromoted(uint16 quarterIdx);
    event RewardDeclared(uint16 quarterIdx, uint256 amount, uint256 totalAmount);
    event StakeLocked(uint256 amount, uint16 unlockQuarter, address locker, bool isNew);

    /**
     * @dev Initializer function.
     * @param _bbsToken The address of the BBS token contract.
     */
    function initialize(IERC20 _bbsToken) public initializer {
        __Ownable_init();
        bbsToken = _bbsToken;
        currentQuarter = 0;
        currentQuarterEnd = block.timestamp + QUARTER_LENGTH;
    }

    /**
     * @dev Get the number of stakes for an address (automatic getters require the index of the stake).
     * @param staker The address of the owner.
     */
    function getNumOfStakes(address staker) external view returns(uint256 numOfStakes) {
        return stakes[staker].length;
    }

    /**
     * @dev Declare a reward for a quarter and transfers the tokens to the contract.
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
        require(block.timestamp >= currentQuarterEnd, "currnet quarter is not yet over");
        require(quarters[currentQuarter].reward > 0, "currnet quarter has no reward");
        currentQuarter++;
        currentQuarterEnd += QUARTER_LENGTH;
        emit QuarterPromoted(currentQuarter);
    }

    /**
     * @dev Update the shares of a stake.
     * @param staker The address of the staker.
     * @param stakeIdx The index of the stake for that staker.
     */
    function updateShare(address staker, uint16 stakeIdx) internal {
        Stake memory stake = stakes[staker][stakeIdx];
        require(block.timestamp < currentQuarterEnd, "quarter must be promoted");
        require(stake.unlockQuarter > currentQuarter, "can not lock for less than one quarter");
        require(stake.unlockQuarter - currentQuarter <= 13, "can not lock for more than 13 quarters");

        for (uint16 quarterIdx = currentQuarter; quarterIdx < stake.unlockQuarter; quarterIdx++) {
            uint256 oldShare = shares[staker][stakeIdx][quarterIdx];
            uint256 newShare = stake.amount * (100 + ((stake.unlockQuarter - quarterIdx - 1) * 25));

            // This only happens when quarterIdx == currentQuarter.
            if (quarterIdx == stake.lockQuarter) {
                newShare = newShare * (currentQuarterEnd - stake.lockTime) / QUARTER_LENGTH;
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
        require(block.timestamp < currentQuarterEnd, "quarter must be promoted");

        for (
            uint16 quarterIdx = stakes[staker][stakeIdx].firstUnclaimedQuarter;
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

        stakes[staker][stakeIdx].firstUnclaimedQuarter = currentQuarter;

        return amount / PRECISION;
    }

    /**
     * @dev Lock a stake of tokens.
     * @param amount Amount of tokens to lock.
     * @param unlockQuarter The index of the quarter the stake unlocks on.
     */
    function lock(uint256 amount, uint16 unlockQuarter) external {
        bbsToken.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].push(Stake(amount, block.timestamp, currentQuarter, unlockQuarter, currentQuarter));
        shares[msg.sender].push();
        updateShare(msg.sender, uint16(stakes[msg.sender].length - 1));
    }

    /**
     * @dev Extend the lock of an existing stake.
     * @param stakeIdx The index of the stake to be extended.
     * @param unlockQuarter The index of the new quarter the lock ends on.
     */
    function extend(uint16 stakeIdx, uint16 unlockQuarter) external {
        require(unlockQuarter > stakes[msg.sender][stakeIdx].unlockQuarter, "must extend beyond current end quarter");
        stakes[msg.sender][stakeIdx].unlockQuarter = unlockQuarter;
        updateShare(msg.sender, stakeIdx);
    }

    /**
     * @dev Restake rewards.
     * @param stakeIdx The index of the stake to be restaked.
     */
    function restake(uint16 stakeIdx) external {
        uint256 rewards = getRewards(msg.sender, stakeIdx);
        require(rewards > 0, "no rewards to restake");
        stakes[msg.sender][stakeIdx].amount += rewards;
        updateShare(msg.sender, stakeIdx);
    }

    /**
     * @dev Claim rewards and stake if unlocked.
     * @param stakeIdx The index of the stake to be claimed.
     */
    function claim(uint16 stakeIdx) external {
        uint256 claimAmount = getRewards(msg.sender, stakeIdx);
        if (stakes[msg.sender][stakeIdx].unlockQuarter <= currentQuarter) {
            claimAmount += stakes[msg.sender][stakeIdx].amount;
            stakes[msg.sender][stakeIdx].amount = 0;
        }
        require(claimAmount > 0, "nothing to claim");
        bbsToken.transfer(msg.sender, claimAmount);
    }
}
