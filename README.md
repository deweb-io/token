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

Boiler plate [OpenZeppelin ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol), ownable, mintable.

`./contracts/BBSToken.sol`

### EOS Contract

[Bancor's modified eosio token](https://github.com/bancorprotocol/contracts_eos/blob/master/contracts/eos/Token/Token.cpp), with only one account (the bridge contract, once it's up) can mint and burn tokens.

## Bridge

This is a Bancor bridge with no modifications on our part.

### Ethereum Contract

https://github.com/bancorprotocol/contracts-solidity/blob/master/solidity/contracts/bancorx/BancorX.sol

### EOS Contract

https://github.com/bancorprotocol/contracts_eos/tree/master/contracts/eos/BancorX

## Governance

[Snapshot](https://snapshot.page/#/) on day one. Then we move to our own message board, probably with [snapshot api](https://docs.snapshot.org/hub-api). Then we may move to using our own voting, integrating eos token holders, give voting power to tokens staked in our staking rewards contract, and even implementing delegated based liquid democracy (see promising algorithm and implementation [here](https://arxiv.org/pdf/1911.08774.pdf).

### Daily Rewards

The daily rewards contract holds a pool of BBS tokens and an updatable list of addresses it sends rewards to, and the amount of rewards it sends. The function that distributes the rewards can be called by anyone, but setting the reward targets is a two phase operation: first the owner has to declare the change, and after 24 hours anyone can cause the change to happen.

`./contracts/DailyRewards.sol`

It is likely that we will also have quarterly rewards, probably over the same contract, at which point we will change its name.

### Staking Rewards

Our current implementation is completely Bancor liquidity oriented (only Bancor positions can be locked), distributes rewards on a daily resolution, and works with a fixed share per position throughout the entire locking period.

`./contracts/LiquidityMining.sol`

The tests for this contract use mock contracts (found in the `./contracts` directory) to simulate a Bancor environment, and it imposes some dependencies and makes compilation a bit trickier. All of this will be soon gone, as we are deprecating this contract in favour of a new approach, which allows the locking of BBS tokens directly, works in a quarterly resolution, and calculates the share of each stake on a dynamic basis. A web-based "paper" demo can be found at `./staking.html` and accessed [here](https://creator-eco.github.io/token/staking.html).

## Tests

The eos components are either completely standard or maintained and tested by Bancor, so we only need tests for the ethereum components. These tests are all run on hardhat, which makes it easy to test on the internal hardhat network, on a local ganache-cli environment, or on a mainnet fork.

- To test on hardhat network:
```shell
npx hardhat test
```

TODO: Add coverage checks ([nyc](https://github.com/istanbuljs/nyc) looks promising).

## Deployment

Currently we have two deployment procedures, one for eos and one for ethereum.

### ethereum Deployment

All our ethereum contracts are compiled and deployed by a hardhat script.

`./scripts/deploy.js`

Deployment on a local ethereum client listening on port 8545:
```shell
npx hardhat run scripts/deploy.js --network localhost
```

Remote deployment:
```shell
npx hardhat run scripts/deploy.js --network <network name>
```

Note that the deployment can be done from any account with sufficient funds to pay for gas, and after deployment, ownership of the contracts will be fully transfered to a gnosis safe held by trusted custodians under an n-out-of-m signatures scheme.

TODO: Add etherscan support with the [hardhat plugin](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html).

### eos Deployment

This part is very standard, and we currently use the scripts only for deployment on testnet.

Our deployment scripts use two environment files:
- `./eosio/bbs.env`: the basic configuration, never altered by scripts
- `./eosio/state.env`: - configurations that are written by the scripts (append only)

The first always takes precedence and is used for constants, the second is written to by the deployment scripts and can always be deleted to start over with the deployment.

The scripts themselves are:
- `./eosio/env.sh`: setup our environment, load environment variables, define helper functions, keep an unlocked wallet - note that this script is meant to be sourced (`. env.sh`)
- `./eosio/create_account.sh`: create a test account on testnet, fund it and buy some RAM
- `./eosio/deploy_token.sh`: compile the token contract, deploy it, and mint some tokens
