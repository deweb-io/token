// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.8.0;


contract mockContractRegistry {
    mapping(bytes32 => address) private contracts;

    function registerAddress(bytes32 _contractName, address _contractAddress) public {
        contracts[_contractName] = _contractAddress;
    }

    function addressOf(bytes32 _contractName) public view returns (address) {
        return contracts[_contractName];
    }
}

