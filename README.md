# BBS Token Components

This repository will contain the components of the BBS token.

To start, make sure you have npm and node 10 installed and run the following command in the root directory of the repo:
```shell
npm install
```

nodeos, cleos, keosd and the eos-cdt are required for the eosio part.

## Token

Our token is an ethereum ERC20, with an eosio leg connected by a bridge.

### Ethereum Contract

`./contracts/BBSToken.sol`

[Boilerplate OpenZeppelin ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.2.0/contracts/token/ERC20/ERC20.sol), ownable, mintable, with the [permit](https://eips.ethereum.org/EIPS/eip-2612) mechanism.

### EOS Contract

[Boilerplate [eosio token](https://github.com/EOSIO/eosio.contracts/tree/master/contracts/eosio.token), which will give the bridge ownership over itself so only it (the bridge) can mint and burn tokens.

## Bridge

A pretty simple eos<=>ethereum bridge, heavily based on Bancor's implementation, and possibly using the same oracles.

### Ethereum Contract

`./contracts/Bridge.sol`

Heavily based on Bancor's [BancorX](https://github.com/bancorprotocol/contracts-solidity/blob/master/solidity/contracts/bancorx/BancorX.sol), ported to solidity 8, with [permit](https://eips.ethereum.org/EIPS/eip-2612) based transfer call, and all of the Bancor environment requirements removed.

### EOS Contract

We are using [Bancor's bridge contract](https://github.com/bancorprotocol/contracts_eos/tree/master/contracts/eos/BancorX) as is.

### Oracles

We are using Bancor's existing infrastructure.

## Governance

We will use [Snapshot](https://snapshot.page/#/) for voting, but we are considering a move to our own message board, probably with [snapshot api](https://docs.snapshot.org/hub-api). Then we may move to using our own voting, integrating eos token holders, give voting power to tokens staked in our staking rewards contract, and even implementing delegated based liquid democracy (see promising algorithm and implementation [here](https://arxiv.org/pdf/1911.08774.pdf).

### Staking Rewards

`./contracts/Staking.sol`

The staking contract is an upgradable contract that distributes rewards on a quarterly basis to addresses that are willing to lock up their BBS tokens. The rewards for each quarter is divided between the stakers according to the amount of tokens locked and the length of the locking period.

The essesntial idea is described and can be played with in this [web-based "paper" demo](https://deweb-io.github.io/token/staking.html).

### Daily Rewards

`./contracts/DailyRewards.sol`

The daily rewards contract holds a pool of BBS tokens and an updatable list of addresses it sends rewards to, and the amount of rewards it sends. The function that distributes the rewards can be called by anyone, but setting the reward targets is a two phase operation: first the owner has to declare the change, and after 24 hours anyone can cause the change to happen.

We are still not sure how useful this will be, and it might change into quarterly rewards.

## Tests

The eos components are either completely standard or maintained and tested by Bancor, so we only need tests for the ethereum components. These tests are all run on Hardhat, which makes it easy to test on the internal Hardhat network, on a local ganache-cli environment, or on a mainnet fork.

To test on Hardhat network:
```shell
npx hardhat test
```

To run tests with a coverage report:
```shell
npx hardhat coverage
```

To run tests with a gas report:
```shell
REPORT_GAS=true npx hardhat test
```

To run tests with load testing (use any desired number of iterations):
```shell
TEST_ITERATIONS=1000 npx hardhat test
```

To run tests with extra console.debug messages:
```shell
TEST_DEBUG=true npx hardhat test
```

## Deployment

All our ethereum related deployment scripts are in `./scripts`, and eosio related scripts are in `./eosio/deployments/`.

We also have a gas calculator, which measures the cost of our full deployment process: `./gas_price_deployment.sh`.

### Etherscan Support

We use Hardhat's Etherscan plugin to automoatically publish our contracts to Etherscan.

Etherscan API-Key token is required to be added to `hardhat.config.js`:
```javascript
etherscan: {
    apiKey: 'API_KEY'
}
```

After Contract deployment:
```shell
npx hardhat verify --network NETWORK_NAME CONTRACT_ADDRESS
```
