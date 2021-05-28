// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// This is a draft for our staking rewards program.

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    uint256 public constant QUARTER_LENGTH = 91 days;

    uint256 public currentQuarterEnd;
    uint16 public currentQuarter;
    IERC20 bbsToken;

    struct Reward {
        uint256 shares;
        uint256 amount;
    }

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint16 startQuarter;
        uint16 endQuarter;
        uint16 firstUnclaimedQuarter;
        mapping(uint16 => uint256) shares;
    }

    mapping(uint16 => Reward) public rewards;
    mapping(address => Stake[]) public stakes;

    event QuarterPromoted(uint16 quarterIdx);
    event RewardDeclared(uint16 quarterIdx, uint256 amount, uint256 totalAmount);
    event StakeLocked(uint256 amount, uint16 endQuarter, address locker, bool isNew);

    /**
     * @dev Constructor (should become initializer) - initializes the current quarter.
     * @param _bbsToken The address of the BBS token contract.
     */
    constructor(IERC20 _bbsToken) {
        bbsToken = _bbsToken;
        currentQuarter = 0;
        currentQuarterEnd = block.timestamp + QUARTER_LENGTH;
    }

    /**
     * @dev Get the shares of a stake in a quarter (automatic getters do not return mappings).
     * @param staker The address of the owner.
     * @param stakeIdx The index of the stake.
     * @param quarterIdx The index of the quarter.
     */
    function getShares(address staker, uint16 stakeIdx, uint16 quarterIdx) external view returns(uint256) {
        return stakes[staker][stakeIdx].shares[quarterIdx];
    }

    /**
     * @dev Promote the current quarter if a quarter ended.
     */
    function promoteQuarter() public {
        if(block.timestamp < currentQuarterEnd) return;
        currentQuarter++;
        currentQuarterEnd += QUARTER_LENGTH;
        emit QuarterPromoted(currentQuarter);
    }

    /**
     * @dev Declare a reward for a quarter and transfers the tokens to the contract.
     * @param quarterIdx The index of the quarter a reward is declared for.
     * @param amount The amount of tokens in the reward - must have sufficient allowance.
     */
    function declareReward(uint16 quarterIdx, uint256 amount) public {
        promoteQuarter();
        bbsToken.transferFrom(msg.sender, address(this), amount);
        rewards[quarterIdx].amount += amount;
        emit RewardDeclared(quarterIdx, amount, rewards[quarterIdx].amount);
    }

    /**
     * @dev Lock a stake of tokens.
     * @param amount Amount of tokens to lock.
     * @param endQuarter The index of the quarter the lock ends on.
     */
    function lock(uint256 amount, uint16 endQuarter) external {
        promoteQuarter();
        bbsToken.transferFrom(msg.sender, address(this), amount);
        require(endQuarter > currentQuarter, "can not lock for less than one quarter");

        Stake storage stake = stakes[msg.sender].push();
        stake.amount = amount;
        stake.startTime = block.timestamp;
        stake.startQuarter = currentQuarter;
        stake.endQuarter = endQuarter;
        stake.firstUnclaimedQuarter = currentQuarter;
        for (uint16 quarterIdx = currentQuarter; quarterIdx < endQuarter; quarterIdx++) {
            stake.shares[quarterIdx] = amount * (100 + ((endQuarter - quarterIdx - 1) * 25));
        }
        stake.shares[currentQuarter] *= currentQuarterEnd - block.timestamp;
        stake.shares[currentQuarter] /= QUARTER_LENGTH;
    }
}
