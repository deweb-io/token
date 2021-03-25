# BBS token components

This repository will contain all components of the BBS token. This includes the token contracts themselves, the cross-blockchain bridge, and some components of the BBS system governance.

To start, make sure you have npm and node 10 installed and run the following command in the home directory of the repo:
```shell
npm install
```

nodeos, cleos, keosd and the eos cdt are required for the eosio part.

## Token

Our token is an ethereum ERC20. It also has an eosio leg which is connected to ethereum via a Bancor bridge.

### Ethereum Contract

`./contracts/BBSToken.sol`

Boiler plate [OpenZeppelin ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol), four decimals precision (for EOS compatibility), mintable, ownable.

#### Tests

- To test on hardhat network:
```shell
npx hardhat test
```

- To test on ganache network:
```shell
npx hardhat test --network ganache
```

#### Deployment

Local deployment on ganache:
```shell
npx hardhat run scripts/deploy.js --network ganache
```

Remote deployment (make sure you have some gas on the network):
```shell
npx hardhat run scripts/deploy.js --network <network name>
```

### EOS Contract

[Bancor's modified eosio token](https://github.com/bancorprotocol/contracts_eos/blob/master/contracts/eos/Token/Token.cpp), with only one account (the bridge contract, once it's up) can mint and burn tokens.

#### Deployment

Our deployment scripts use two environment files:
- `./eosio/bbs.env`: the basic configuration, never altered by scripts
- `./eosio/state.env`: - configurations that are written by the scripts (append only)

The first always takes precedence, the second can be deleted to start over with the deployment.

The scripts themselves are:
- `./eosio/env.sh`: setup our environment, load environment variables, define helper functions, keep an unlocked wallet - note that this script is meant to be sourced
```shell
. env.sh
```
- `./eosio/test_account.sh`: create a test account on testnet, fund it and buy some RAM
- `./eosio/deploy_token.sh`: compile the token contract, deploy it, and even mint some tokens

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


## Deployment Procedure

Currently we are only deploying the ethereum token, which is a pretty simple procedure. After deployment, ownership of the token will be fully transfered to a gnosis safe held by trusted custodians under an n-out-of-m signatures scheme.
