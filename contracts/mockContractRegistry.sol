// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.8.0;


contract mockContractRegistry {
    mapping(bytes32 => address) private contracts;

    function addContract(address _addr, bytes32 _name) public {
        contracts[_name] = _addr;
    }

    function addressOf(bytes32 _contractName) public view returns (address) {
        return contracts[_contractName];
    }
}

