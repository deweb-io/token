#!/usr/bin/env bash
# Deploy a token if none is deployed.
. env.sh

if [ ! -f eosio.token.wasm ]; then
    git clone https://github.com/EOSIO/eosio.contracts --branch v1.7.0 --single-branch
    pushd eosio.contracts/contracts/eosio.token/
    eosio-cpp -I include -o eosio.token.wasm src/eosio.token.cpp --abigen
    popd
    mv eosio.contracts/contracts/eosio.token/eosio.token.* .
    rm -rf eosio.contracts/
fi

kleos set contract $account . ./eosio.token.wasm ./eosio.token.abi -p $account@active
echo creating token
kleos push action $account create '[ "'$account'", "1000000000.0000 BBS"]' -p $account@active
echo getting balance
kleos get currency balance $account $account
echo issuing tokens
kleos push action $account issue '[ "'$account'", "100.0000 BBS", "memo" ]' -p $account@active
echo getting balance
kleos get currency balance $account $account
