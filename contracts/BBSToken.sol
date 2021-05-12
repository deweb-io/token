// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title BBS token contract
 */
contract BBSToken is ERC20, Ownable {
    constructor() public ERC20("BBS", "BBS") Ownable() {
    }

    function issue(address to, uint256 amount) public onlyOwner {
        require(to == msg.sender, "issue tokens is allowed only to the owner");
        _mint(to, amount);
    }
}
