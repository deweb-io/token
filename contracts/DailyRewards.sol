// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.8.0;

/**
 * @title Reward
 * @dev Set and distribute daily rewards.
 */
contract DailyRewards {

    uint256 public constant DECLARATION_INTERVAL = 1 days;
    uint256 public constant REWARD_INTERVAL = 1 days;

    struct Reward {
        address beneficiary;
        uint256 amountBBS;
    }
    address owner;
    Reward[] public rewards;
    Reward[] public declaredRewards;
    uint256 public declarationTimestamp;
    uint256 public lastDistributionTimestamp;

    /**
     * @dev Set Owner
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Declare the daily rewards before they are set.
     * @param addressesToSet A list of addresses to reward.
     * @param rewardsToSet A mapping of the reward to give addresses.
     */
    function declareRewards(address[] memory addressesToSet, uint256[] memory rewardsToSet) external {
        require(msg.sender == owner, "non-owner reward declaration");
        delete declaredRewards;
        for (uint256 i = 0; i < addressesToSet.length; i++) {
            declaredRewards.push(Reward(addressesToSet[i], rewardsToSet[i]));
        }
        declarationTimestamp = block.timestamp;
    }

     /**
     * @dev Set the daily rewards as they were declared.
     */
    function setRewards() external {
        require(declarationTimestamp > 0, "no rewards declared");
        require(block.timestamp - declarationTimestamp >= DECLARATION_INTERVAL, "rewards declared too recently");
        rewards = declaredRewards;
        declarationTimestamp = 0;
    }
}
