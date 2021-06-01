// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// This is a draft for our staking rewards program.

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Staking_upgrade is Initializable, OwnableUpgradeable {
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
        uint256 startTime;
        uint16 startQuarter;
        uint16 endQuarter;
        uint16 firstUnclaimedQuarter;
        mapping(uint16 => uint256) shares;
    }

    mapping(uint16 => Quarter) public quarters;
    mapping(address => Stake[]) public stakes;

    event QuarterPromoted(uint16 quarterIdx);
    event RewardDeclared(uint16 quarterIdx, uint256 amount, uint256 totalAmount);
    event StakeLocked(uint256 amount, uint16 endQuarter, address locker, bool isNew);

    /**
     * @dev Constructor (should become initializer) - initializes the current quarter.
     * @param _bbsToken The address of the BBS token contract.
     */
    function initialize(IERC20 _bbsToken) public initializer {
        __Ownable_init();
        bbsToken = _bbsToken;
        currentQuarter = 0;
        currentQuarterEnd = block.timestamp + QUARTER_LENGTH;
    }

    /**
     * @dev Promote the current quarter if a quarter ended.
     */
    function promoteQuarter() public {
        if (block.timestamp < currentQuarterEnd) return;
        currentQuarter++;
        currentQuarterEnd += QUARTER_LENGTH;
        emit QuarterPromoted(currentQuarter);
    }

    /**
     * @dev Get the share of a stake in a quarter (automatic getters do not return mappings).
     * @param staker The address of the owner.
     * @param stakeIdx The index of the stake.
     * @param quarterIdx The index of the quarter.
     */
    function getShare(address staker, uint16 stakeIdx, uint16 quarterIdx) external view returns(uint256 share) {
        return stakes[staker][stakeIdx].shares[quarterIdx];
    }

    /**
     * @dev Get the unclaimed reward a stake currently deserves.
     * @param stake The stake for which reward is calculated.
     */
    function calculateReward(Stake storage stake) internal view returns(uint256 reward) {
        for (uint16 quarterIdx = stake.firstUnclaimedQuarter; quarterIdx < currentQuarter; quarterIdx++) {
            reward += PRECISION * quarters[quarterIdx].reward / quarters[quarterIdx].shares * stake.shares[quarterIdx];
        }
        reward /= PRECISION;
        if (stake.endQuarter <= currentQuarter) {
            reward += stake.amount;
        }
        return reward;
    }

    /**
     * @dev Get the unclaimed reward a stake currently deserves.
     * @param stake The stake for which reward is calculated.
     */
    function updateShare(Stake storage stake) internal returns(Stake storage updatedStake) {
        promoteQuarter();
        require(stake.endQuarter > currentQuarter, "can not lock for less than one quarter");
        require(stake.endQuarter - currentQuarter <= 13, "can not lock for more than 13 quarters");

        for (uint16 quarterIdx = currentQuarter; quarterIdx < stake.endQuarter; quarterIdx++) {
            uint256 oldShare = stake.shares[quarterIdx];
            uint256 newShare = stake.amount * (200 + ((stake.endQuarter - quarterIdx - 1) * 25));

            // This only happens when quarterIdx == currentQuarter.
            if (quarterIdx == stake.startQuarter) {
                newShare = newShare * (currentQuarterEnd - block.timestamp) / QUARTER_LENGTH;
            }

            stake.shares[quarterIdx] = newShare;
            quarters[quarterIdx].shares += newShare - oldShare;
        }
        return stake;
    }

    /**
     * @dev Declare a reward for a quarter and transfers the tokens to the contract.
     * @param quarterIdx The index of the quarter a reward is declared for.
     * @param amount The amount of tokens in the reward - must have sufficient allowance.
     */
    function declareReward(uint16 quarterIdx, uint256 amount) external {
        promoteQuarter();
        bbsToken.transferFrom(msg.sender, address(this), amount);
        quarters[quarterIdx].reward += amount;
        emit RewardDeclared(quarterIdx, amount, quarters[quarterIdx].reward);
    }

    /**
     * @dev Lock a stake of tokens.
     * @param amount Amount of tokens to lock.
     * @param endQuarter The index of the quarter the lock ends on.
     */
    function lock(uint256 amount, uint16 endQuarter) external {
        bbsToken.transferFrom(msg.sender, address(this), amount);
        Stake storage stake = stakes[msg.sender].push();
        stake.amount = amount;
        stake.startTime = block.timestamp;
        stake.startQuarter = currentQuarter;
        stake.endQuarter = endQuarter;
        stake.firstUnclaimedQuarter = currentQuarter;
        stake = updateShare(stake);
    }

    /**
     * @dev Extend the lock of an existing stake.
     * @param stakeIdx The index of the stake to be extended.
     * @param endQuarter The index of the new quarter the lock ends on.
     */
    function extend(uint16 stakeIdx, uint16 endQuarter) external {
        Stake storage stake = stakes[msg.sender][stakeIdx];
        require(endQuarter > stake.endQuarter, "can only extend beyond current end quarter");
        stake.endQuarter = endQuarter;
        stake = updateShare(stake);
    }

    /**
     * @dev Restake current rewards.
     * @param stakeIdx The index of the stake to be restaked.
     */
    function restake(uint16 stakeIdx) external {
        Stake storage stake = stakes[msg.sender][stakeIdx];
        uint256 reward = calculateReward(stake);
        require(reward > 0, "no rewards to restake");
        stake.firstUnclaimedQuarter = currentQuarter;
        stake.amount += reward;
        stake = updateShare(stake);
    }

    /**
     * @dev Claim rewards.
     * @param stakeIdx The index of the stake to be claimed.
     */
    function claim(uint16 stakeIdx) external {
        Stake storage stake = stakes[msg.sender][stakeIdx];
        uint256 reward = calculateReward(stake);
        require(reward > 0, "no rewards to claim");
        stake.firstUnclaimedQuarter = currentQuarter;
        bbsToken.transfer(msg.sender, reward);
    }
}
