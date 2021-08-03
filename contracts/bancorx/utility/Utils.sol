// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Utilities & Common Modifiers
 */
contract Utils {
    uint32 internal constant PPM_RESOLUTION = 1000000;

    // verifies that a value is greater than zero
    modifier greaterThanZero(uint256 _value) {
        _greaterThanZero(_value);
        _;
    }

    // error message binary size optimization
    function _greaterThanZero(uint256 _value) internal pure {
        require(_value > 0, "ERR_ZERO_VALUE");
    }

    // verifies that a value is greater than some amount
    modifier greaterEqualThanAmount(uint256 _value, uint256 _amount) {
        _greaterEqualThanAmount(_value, _amount);
        _;
    }

    // error message binary size optimization
    function _greaterEqualThanAmount(uint256 _value, uint256 _amount) internal pure {
        require(_value >= _amount, "ERR_VALUE_TOO_LOW");
    }

    // validates an address - currently only checks that it isn't null
    modifier validAddress(address _address) {
        _validAddress(_address);
        _;
    }

    // error message binary size optimization
    function _validAddress(address _address) internal pure {
        require(_address != address(0), "ERR_INVALID_ADDRESS");
    }

    // validates an external address - currently only checks that it isn't null or this
    modifier validExternalAddress(address _address) {
        _validExternalAddress(_address);
        _;
    }

    // error message binary size optimization
    function _validExternalAddress(address _address) internal view {
        require(_address != address(0) && _address != address(this), "ERR_INVALID_EXTERNAL_ADDRESS");
    }
}
