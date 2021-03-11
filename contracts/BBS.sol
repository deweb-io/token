// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


/**
 * @title BBS token contract
 */
contract BBSToken is ERC20 {
    constructor(uint256 initialSupply) public ERC20("BBS", "BBS") {
        _setupDecimals(4);
        _mint(msg.sender, initialSupply);
    }
}