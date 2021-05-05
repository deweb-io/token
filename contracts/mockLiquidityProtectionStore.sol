// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.12 <0.8.0;

import "@bancor/contracts-solidity/solidity/contracts/token/interfaces/IDSToken.sol";
import "@bancor/contracts-solidity/solidity/contracts/token/interfaces/IReserveToken.sol";
import "hardhat/console.sol";


/**
    based on https://github.com/bancorprotocol/contracts-solidity/blob/master/solidity/contracts/liquidity-protection/LiquidityProtectionStore.sol
 */
contract mockLiquidityProtectionStore {

    uint256 private nextProtectedLiquidityId;

    struct ProtectedLiquidity {
        address provider; // liquidity provider
        uint256 reserveAmount; // reserve token amount
    }

    mapping(uint256 => ProtectedLiquidity) private protectedLiquidities;

    function protectedLiquidity(uint256 _id)
        external
        view
        returns (
            address,
            IDSToken,
            IReserveToken,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        ProtectedLiquidity storage liquidity = protectedLiquidities[_id];
        return (
            liquidity.provider,
            IDSToken(address(0)),
            IReserveToken(address(0)),
            0,
            liquidity.reserveAmount,
            0,
            0,
            0
        );
    }

    function addProtectedLiquidity(
        address _provider,
        IDSToken _poolToken,
        IReserveToken _reserveToken,
        uint256 _poolAmount,
        uint256 _reserveAmount,
        uint256 _reserveRateN,
        uint256 _reserveRateD,
        uint256 _timestamp
    ) external /*override ownerOnly*/ returns (uint256) {
        // validate input
        require(
            _provider != address(0) &&
                _provider != address(this) &&
                address(_poolToken) != address(0) &&
                address(_poolToken) != address(this) &&
                address(_reserveToken) != address(0) &&
                address(_reserveToken) != address(this),
            "ERR_INVALID_ADDRESS"
        );
        require(
            _poolAmount > 0 && _reserveAmount > 0 && _reserveRateN > 0 && _reserveRateD > 0 && _timestamp > 0,
            "ERR_ZERO_VALUE"
        );

        uint256 id = nextProtectedLiquidityId;
        nextProtectedLiquidityId += 1;

        protectedLiquidities[id] = ProtectedLiquidity({
            provider: _provider,
            reserveAmount: _reserveAmount
        });

        //console.log('added protected liquidity to id %s <%s:%s>', id, _provider , _amount);
        return id;
    }
}