#!/usr/bin/env bash
# Deploy a token if none is deployed.
. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'


if [ ! -f Token.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/Token
    eosio-cpp ./Token.cpp
    popd
    mv contracts_eos/contracts/eos/Token/Token.{wasm,abi} .
    rm -rf contracts_eos

    echo "${GREEN}-----------------------DEPLOYING BBS CONTRACT -----------------------${NC}"
    kleos system buyram $bbs_account $bbs_account "10.0000 EOS" -p $bbs_account@active
    # kleos set account permission $bbs_account active --add-code
    kleos set code $bbs_account ./Token.wasm -p $bbs_account@active
    kleos set contract $bbs_account . ./Token.wasm ./Token.abi -p $bbs_account@active
    echo "${GREEN}-----------------------DEPLOYING BBS DONE!-----------------------${NC}"

    echo "${GREEN}-----------------------CREATING BBS TOKEN -----------------------${NC}"
    kleos push action $bbs_account create '[ "'$bridge_account'", "1000000.0000 BBS"]' -p $bbs_account@active
    echo "${GREEN}-----------------------CREATING BBS DONE!-----------------------${NC}"
fi
