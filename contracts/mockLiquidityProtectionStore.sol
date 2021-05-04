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
        uint256 poolAmount; // reserve token amount
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
            liquidity.poolAmount,
            0,
            0,
            0,
            0
        );
    }

    function addProtectedLiquidity(address _provider, uint256 _amount) public returns (uint256 id) {
        uint256 id = nextProtectedLiquidityId;
        nextProtectedLiquidityId += 1;

        protectedLiquidities[id] = ProtectedLiquidity({
            provider: _provider,
            poolAmount: _amount
        });

        //console.log('added protected liquidity to id %s <%s:%s>', id, _provider , _amount);
        return id;
    }

    function transferPosition(address _provider, uint256 _id, address _newProvider) public {
        require(protectedLiquidities[_id].provider == _provider, 'position not belongs to provider');
        protectedLiquidities[_id].provider = _newProvider;
    }
}