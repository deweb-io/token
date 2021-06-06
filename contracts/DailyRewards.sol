// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Reward
 * @dev Set and distribute daily rewards.
 */
contract DailyRewards is Ownable {
    IERC20 immutable bbsToken;

    uint256 public constant DECLARATION_INTERVAL = 1 days;
    uint256 public constant DISTRIBUTION_INTERVAL = 1 days;
    uint256 public declarationTimestamp;
    uint256 public distributionTimestamp;

    struct Reward {
        address beneficiary;
        uint256 amountBBS;
    }
    Reward[] public rewards;
    Reward[] public declaredRewards;

    event RewardsDeclared();
    event RewardsSet();
    event RewardDistributed(address beneficiary, uint256 amountBBS);
    event RewardsDistributed();

    /**
     * @dev Set bbsToken instance.
     * @param _bbsToken The address of the BBS token contract.
     */
    constructor(IERC20 _bbsToken) {
        bbsToken = _bbsToken;
    }

    /**
     * @dev Declare the daily rewards before they are set.
     * @param beneficiariesToSet A list of addresses of reward beneficiaries.
     * @param amountsToSet A list of BBS amounts to reward the corresponding beneficiaries every day.
     */
    function declareRewards(address[] calldata beneficiariesToSet, uint256[] calldata amountsToSet) external onlyOwner {
        require(beneficiariesToSet.length == amountsToSet.length, "missing amounts to set for all beneficiaries");
        delete declaredRewards;
        for (uint16 rewardIndex = 0; rewardIndex < beneficiariesToSet.length; rewardIndex++) {
            declaredRewards.push(Reward(beneficiariesToSet[rewardIndex], amountsToSet[rewardIndex]));
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
        for (uint16 rewardIndex = 0; rewardIndex < rewards.length; rewardIndex++) {
            bbsToken.transfer(rewards[rewardIndex].beneficiary, rewards[rewardIndex].amountBBS);
            emit RewardDistributed(rewards[rewardIndex].beneficiary, rewards[rewardIndex].amountBBS);
        }
        distributionTimestamp = block.timestamp;
        emit RewardsDistributed();
    }
}
