// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.12 <0.8.0;

import "@bancor/contracts-solidity/solidity/contracts/liquidity-protection/interfaces/ILiquidityProtectionStore.sol";
import "@bancor/contracts-solidity/solidity/contracts/liquidity-protection/interfaces/ITransferPositionCallback.sol";

import "@bancor/contracts-solidity/solidity/contracts/token/interfaces/IDSToken.sol";
import "@bancor/contracts-solidity/solidity/contracts/token/interfaces/IReserveToken.sol";

import "hardhat/console.sol";

contract mockLiquidityProtection {

    uint8 private constant FUNC_SELECTOR_LENGTH = 4;
    ILiquidityProtectionStore private immutable _store;

    // NOTE: The input for store is an address, but there is some dark magic converting it behind the scenes.
    constructor(ILiquidityProtectionStore store) public {
        _store = store;
    }

    function transferPositionAndNotify(
        uint256 id,
        address newProvider,
        ITransferPositionCallback callback, //lm contract
        bytes calldata data
    ) external /*override protected validAddress(newProvider) validAddress(address(callback))*/ returns (uint256) {
        uint256 newId = transferPosition(msg.sender, id, newProvider);

        callback.onTransferPosition(newId, msg.sender, data);

        return newId;
    }

    /**
        mock implementation: just create a new position to mock new position id.
     */
    function transferPosition(
        address provider,
        uint256 id,
        address newProvider
    ) internal returns (uint256) {
        console.log('transfer position %s from %s to %s', id, provider, newProvider);

        (address _provider, 
            IDSToken _poolToken, 
            IReserveToken _reserveToken,
            uint256 _poolAmount, 
            uint256 _reserveAmount,
            uint256 _reserveRateN, 
            uint256 _reserveRateD, 
            uint256 _timestamp) = _store.protectedLiquidity(id);

        return _store.addProtectedLiquidity(
            newProvider, _poolToken, _reserveToken, _poolAmount, 
            _reserveAmount, _reserveRateN, _reserveRateD, _timestamp);
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
