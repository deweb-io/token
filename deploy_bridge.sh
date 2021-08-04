#!/usr/bin/env bash
# This script is used to deploy our BBS bridge

pushd "$(dirname "${BASH_SOURCE[0]}")"


# deploy eos contracts
echo DEPLOYING EOS...
pushd eosio

# create all necessary accounts if needed
. create_accounts.sh

# deploy BBS token
. deploy_token.sh

# deploy bancorX
. deploy_bancorx.sh
popd
echo DONE EOS


# deploy ethereum contracts
echo DEPLOYING ETHEREUM...
ethereum_network='ropsten'
npx hardhat run --network $ethereum_network ./scripts/deploy_bancorx.js
echo DONE ETHEREUM


# envs
export EOS_BBS_TOKEN_MAXIMUM_SUPPLY='1000000.0000 BBS'
export EOS_BBS_TOKEN_ISSUE_AMOUNT='100.0000 BBS'
export EOS_BANCORX_MIN_REPORTERS='1'
export EOS_BANCORX_MIN_LIMIT='10000'
export EOS_BANCORX_LIMIT_INC='10000'
export EOS_BANCORX_MAX_ISSUE_LIMIT='800000000'
export EOS_BANCORX_MAX_DESTROY_LIMIT='400000000'

export ETHEREUM_BANCORX_MAX_LOCK_LIMIT='40000000000000000000000'
export ETHEREUM_BANCORX_MAX_RELEASE_LIMIT='80000000000000000000000'
export ETHEREUM_BANCORX_MIN_LIMIT='1000000000000000000'
export ETHEREUM_BANCORX_LIMIT_INC_PER_BLOCK='500000000000000000000'
export ETHEREUM_BANCORX_MIN_REQUIRED_REPORTS=1
export ETHEREUM_BANCORX_COMMISSION_AMOUNT='12000000000000000000'
export ETHEREUM_BANCORX_REPORTER_ADDRESS='0x41C87AC77a3ec4E192F0f3a0c598f8027Ec16177'


echo DONE!

