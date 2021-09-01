#!/usr/bin/env bash
# Deploy eos bridge if none is deployed.
. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'


if [ ! -f BancorX.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/BancorX
    eosio-cpp ./BancorX.cpp
    popd
    mv contracts_eos/contracts/eos/BancorX/BancorX.{wasm,abi} .
    rm -rf contracts_eos


    echo "${GREEN}-----------------------DEPLOYING BRIDGE----------------------${NC}"
    kleos system buyram $bridge_account $bridge_account "10.0000 EOS" -p $bridge_account@active
    kleos set account permission $bridge_account active --add-code
    kleos set code $bridge_account . ./BancorX.wasm -p $bridge_account@active
    kleos set contract $bridge_account . ./BancorX.wasm ./BancorX.abi -p $bridge_account@active

    echo "${GREEN}-----------------------INIT BRIDGE----------------------${NC}"
    kleos push action $bridge_account init '["'$bbs_account'", "'$EOS_BRIDGE_MIN_REPORTERS'", "'$EOS_BRIDGE_MIN_LIMIT'", "'$EOS_BRIDGE_LIMIT_INC'", "'$EOS_BRIDGE_MAX_ISSUE_LIMIT'", "'$EOS_BRIDGE_MAX_DESTROY_LIMIT'"]' -p $bridge_account@active

    echo "${GREEN}-----------------------ADD/ENABLE REPORTING-----------------------${NC}"
    kleos push action $bridge_account addreporter '["'$reporter_account'"]' -p $bridge_account@active
    kleos push action $bridge_account enablerpt '[true]' -p $bridge_account@active
    kleos push action $bridge_account enablext '[true]' -p $bridge_account@active
    kleos get table $bridge_account $bridge_account settings
fi
