# BBS token components

This repository will contain all components of the BBS token. This includes the token contracts themselves, the cross-blockchain bridge, and some components of the BBS system governance.

To start, make sure you have npm and node 10 installed and run the following commands in the root directory of the repo:
```shell
export NODE_OPTIONS="--max-old-space-size=4096"
npm install --force
```

nodeos, cleos, keosd and the eos-cdt are required for the eosio part.

## Token

Our token is an ethereum ERC20. It also has an eosio leg which is connected to ethereum via a Bancor bridge.

### Ethereum Contract

`./contracts/BBSToken.sol`

Boiler plate [OpenZeppelin ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol), ownable, mintable.

#### Tests

- To test on hardhat network:
```shell
npx hardhat test
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

### Daily Rewards

The daily rewards contract holds a pool of BBS tokens and an updatable list of addresses it sends rewards to, and the amount of rewards it sends. The function that distributes the rewards can be called by anyone, but setting the reward targets is a two phase operation: first the owner has to declare the change, and after 24 hours anyone can cause the change to happen.

`./contracts/DailyRewards.sol`

It is likely that we will also have quarterly rewards, probably over the same contract, at which point we will change its name.

### Staking Rewards

Our current implementation is completely Bancor liquidity oriented (only Bancor positions can be locked), distributes rewards on a daily resolution, and works with a fixed share per position throughout the entire locking period.

We should add more documentation here, explain how we test with mocks and how to set up a "realer" environment, possibly also add a hardhat fork option, but since we are re-writing the entire thing it can probably wait.

`./contracts/LiquidityMining.sol`

We are now working on a different implementation, which allows the locking of BBS tokens directly, works in a quarterly resolution, and calculates the share of each stake on a dynamic basis. A web-based "paper" demo can be experienced here:

`./staking.html`

## Deployment Procedure

Currently we are only deploying the ethereum token, which is a pretty simple procedure. The deployment can be done from any account (with code verification sent to etherscan) with some gas, and after deployment, ownership of the token will be fully transfered to a gnosis safe held by trusted custodians under an n-out-of-m signatures scheme.
