// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.12 <0.8.0;

import "@bancor/contracts-solidity/solidity/contracts/liquidity-protection/interfaces/ILiquidityProtectionStore.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "hardhat/console.sol";

contract mockLiquidityProtection {

    uint8 private constant FUNC_SELECTOR_LENGTH = 4;
    ILiquidityProtectionStore private immutable _store;

    // NOTE: The input for store is an address, but there is some dark magic converting it behind the scenes.
    constructor(ILiquidityProtectionStore store) public {
        _store = store;
    }

    function transferPositionAndCall(
        uint256 id,
        address newProvider,
        address target,
        bytes memory data
    ) external /*protected validAddress(newProvider) validAddress(target)*/ returns (uint256) {
        // make sure that we're not trying to call into the zero address or a fallback function
        require(data.length >= FUNC_SELECTOR_LENGTH, "ERR_INVALID_CALL_DATA");

        uint256 newId = transferPosition(msg.sender, id, newProvider);

        Address.functionCall(target, data, "ERR_CALL_FAILED");

        return newId;
    }

    /**
        mock implementation
     */
    function transferPosition(
        address provider,
        uint256 id,
        address newProvider
    ) internal returns (uint256) {
        console.log('transfer position %s from %s to %s', id, provider, newProvider);
        return id;
    }

    /**
        external use
     */
    function transferPosition(uint256 id, address newProvider)
        external
        // protected
        // validAddress(newProvider)
        returns (uint256)
    {
        return transferPosition(msg.sender, id, newProvider);
    }

    function store() external view returns (ILiquidityProtectionStore) {
        return _store;
    }
}
