#!/usr/bin/env bash
# Deploy a token if none is deployed.
. env.sh

if [ ! -f Token.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/Token
    eosio-cpp ./Token.cpp
    popd
    mv contracts_eos/contracts/eos/Token/Token.{wasm,abi} .
    rm -rf contracts_eos
fi

kleos set contract $account . ./Token.wasm ./Token.abi -p $account@active
echo creating token
kleos push action $account create '[ "'$account'", "1000000000.0000 BBS"]' -p $account@active
echo getting balance
kleos get currency balance $account $account
echo issuing tokens
kleos push action $account issue '[ "'$account'", "100.0000 BBS", "memo" ]' -p $account@active
echo getting balance
kleos get currency balance $account $account
