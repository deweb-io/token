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

### Local Deployment
```shell
npx hardhat run scripts/deploy.js --network ganache
```

### Remote deployment

```shell
npx hardhat run scripts/deploy.js --network <network name>
```

## Token

Our token is an ethereum ERC20. It can also be pegged into an EOS blockchain via a Bancor bridge.

### Ethereum Contract

`./contracts/BBSToken.sol`

Boiler plate [OpenZeppelin ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol), four decimals precision (for EOS compatibility), mintable, ownable.

### EOS Contract

### Deployment Procedure

## Bridge

### Ethereum Contract

### EOS Contract

## Governance

### Daily Rewards Contract

`./contracts/DailyRewards.sol`
