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

    # ensure bbs_account have enough eos. TODO: JUST FOR TESTING!!!!
    kleos push action eosio.token transfer '["'$account'","'$bbs_account'","70.0000 EOS",""]' -p $account@active
    # ensure bbs_account have enough eos. TODO: JUST FOR TESTING!!!!

    echo -e "${GREEN}----DEPLOYING BBS CONTRACT----${NC}"
    kleos system buyram $bbs_account $bbs_account "10.0000 EOS" -p $bbs_account@active
    kleos set code $bbs_account ./Token.wasm -p $bbs_account@active # bbs_account should have 'eosio.code' permission
    kleos set contract $bbs_account . ./Token.wasm ./Token.abi -p $bbs_account@active
    echo -e "${GREEN}----DEPLOYING BBS CONTRACT DONE!----${NC}"

    echo -e "${GREEN}----CREATING BBS TOKEN----${NC}"
    kleos push action $bbs_account create '[ "'$bridge_account'", "1000000.0000 BBS"]' -p $bbs_account@active
    echo -e "${GREEN}----CREATING BBS TOKEN DONE!----${NC}"
fi
