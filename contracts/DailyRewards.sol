// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Reward
 * @dev Set and distribute daily rewards.
 */
contract DailyRewards {

    uint256 public constant DECLARATION_INTERVAL = 1 days;
    uint256 public constant DISTRIBUTION_INTERVAL = 1 days;

    struct Reward {
        address beneficiary;
        uint256 amountBBS;
    }
    address owner;
    IERC20 bbsToken;
    Reward[] public rewards;
    Reward[] public declaredRewards;
    uint256 public declarationTimestamp;
    uint256 public distributionTimestamp;

    event RewardsDeclared();
    event RewardsSet();
    event RewardDistributed(address beneficiary, uint256 amountBBS);
    event RewardsDistributed();

    /**
     * @dev Set Owner
     */
    constructor(address bbsTokenAddress) {
        owner = msg.sender;
        bbsToken = IERC20(bbsTokenAddress);
    }

    /**
     * @dev Declare the daily rewards before they are set.
     * @param addressesToSet A list of addresses to reward.
     * @param rewardsToSet A mapping of the reward to give addresses.
     */
    function declareRewards(address[] memory addressesToSet, uint256[] memory rewardsToSet) external {
        require(msg.sender == owner, "non-owner reward declaration");
        delete declaredRewards;
        for (uint256 rewardIndex = 0; rewardIndex < addressesToSet.length; rewardIndex++) {
            declaredRewards.push(Reward(addressesToSet[rewardIndex], rewardsToSet[rewardIndex]));
        }
        declarationTimestamp = block.timestamp;
        emit RewardsDeclared();
    }

     /**
     * @dev Set the daily rewards as they were declared.
     */
    function setRewards() external {
        require(declarationTimestamp > 0, "no rewards declared");
        require(block.timestamp - declarationTimestamp >= DECLARATION_INTERVAL, "rewards declared too recently");
        rewards = declaredRewards;
        declarationTimestamp = 0;
        emit RewardsSet();
    }

     /**
     * @dev Distribute the daily rewards as they were set.
     */
    function distributeRewards() external {
        require(block.timestamp - distributionTimestamp >= DISTRIBUTION_INTERVAL, "rewards distributed too recently");
        for (uint256 rewardIndex = 0; rewardIndex < rewards.length; rewardIndex++) {
            bbsToken.transfer(rewards[rewardIndex].beneficiary, rewards[rewardIndex].amountBBS);
            emit RewardDistributed(rewards[rewardIndex].beneficiary, rewards[rewardIndex].amountBBS);
        }
        distributionTimestamp = block.timestamp;
        emit RewardsDistributed();
    }
}
