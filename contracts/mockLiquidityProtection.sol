// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.12 <0.8.0;

import "./mockLiquidityProtectionStore.sol";
import "@openzeppelin/contracts/utils/Address.sol";

   
contract mockLiquidityProtection {

    uint8 private constant FUNC_SELECTOR_LENGTH = 4;
    address _store;

    constructor(address _store) public {
        _store = _store;
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
        //mockLiquidityProtectionStore(_store).transferPosition(provider, id, newProvider);
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
}