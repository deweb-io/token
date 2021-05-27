// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// This is a draft for our staking rewards program.

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract LiquidityMining is Ownable {
    using SafeMath for uint256;

    IERC20 bbsToken;

    struct Stake {
        uint256 numberOfShares;
    }

    mapping(address => Stake[]) public stakes;

    /// EVENTS - we need to think about what we really want. The following are suggestions.
    event LockStarted(address  _address ,uint256 _amount, uint16 _numberOfDays);

    constructor(IERC20 _bbsToken) {
        bbsToken = _bbsToken;
    }
}
