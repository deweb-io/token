# BBS token components

This repository will contain all components of the BBS token. This includes the token contracts themselves, the cross-blockchain bridge, and some components of the BBS system governance.

```shell
npm install
```

## Tests

- To test on hardhat network:
```shell
npx hardhat test
```

- To test on ganache network:
```shell
npx hardhat test --network ganache
```

## Deployment

Local deployment on ganache:
```shell
npx hardhat run scripts/deploy.js --network ganache
```

Remote deployment:
```shell
npx hardhat run scripts/deploy.js --network <network name>
```

## Token

Our token is an ethereum ERC20. It also has an eosio leg which is connected to ethereum via a Bancor bridge.

### Ethereum Contract

`./contracts/BBSToken.sol`

Boiler plate [OpenZeppelin ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol), four decimals precision (for EOS compatibility), mintable, ownable.

### EOS Contract

Classic [eosio token](https://github.com/EOSIO/eosio.contracts/blob/master/contracts/eosio.token/src/eosio.token.cpp), in which only one account (the bridge contract, once it's up) can mint and burn tokens.

#### Helper Scripts

Our scripts use two environment files:
- `./eosio/bbs.env`: the basic configuration, never altered by scripts
- `./eosio/generated.env`: - configurations that are written by the scripts (append only)

The first always takes precedence.

The scripts themselves are:
- `./eosio/env.sh`: setup our environment, load environment variables, define helper functions, keep an unlocked wallet - note that this script is meant to be sourced
```shell
. env.sh
```
- `./eosio/test_account.sh`: create a test account, fund it and buy some RAM

We need to finish the script to deploy an actual token.

### Deployment Procedure

- Issue token from any funded account
- Transfer ownership to a multisig on gnosis safe

## Bridge

This is a Bancor bridge with no modifications on our part.

### Ethereum Contract

https://github.com/bancorprotocol/contracts-solidity/blob/master/solidity/contracts/bancorx/BancorX.sol

### EOS Contract

https://github.com/bancorprotocol/contracts_eos/tree/master/contracts/eos/BancorX

## Governance

[Snapshot](https://snapshot.page/#/) on day one. Then we move to our own message board, with [snapshot api](https://docs.snapshot.org/hub-api). Then we may move to using our own voting, integrating eos token holders, implementing delegated based liquid democracy (see promising algorithm and implementation [here](https://arxiv.org/pdf/1911.08774.pdf).

### Daily Rewards Contract

`./contracts/DailyRewards.sol`
