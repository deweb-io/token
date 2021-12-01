// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBridge {
    function sendRewards(uint256 amount) external;
}

contract RewardsSender {
    IBridge bridge;
    IERC20 bbsToken;

    constructor(IERC20 _bbsToken, IBridge _bridge) {
        bridge = _bridge;
        bbsToken = _bbsToken;
        bbsToken.approve(address(bridge), 2**256 - 1);
    }

    function sendRewards() external {
        bridge.sendRewards(bbsToken.balanceOf(address(this)));
    }
}