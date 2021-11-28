// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Bridge.sol";


contract RewardsSender {
    Bridge bridge;
    ERC20 bbsToken;

    constructor(ERC20 _bbsToken, Bridge _bridge) {
        bridge = _bridge;
        bbsToken = _bbsToken;
        bbsToken.approve(address(bridge), 2**256 - 1);
    }

    function sendRewards() external {
        bridge.sendRewards(bbsToken.balanceOf(address(this)));
    }
}