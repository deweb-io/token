#!/usr/bin/env bash
# Deploy eos bridge if none is deployed.
. env.sh

if [ ! -f BancorX.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/BancorX
    eosio-cpp ./BancorX.cpp
    popd
    mv contracts_eos/contracts/eos/BancorX/BancorX.{wasm,abi} .
    rm -rf contracts_eos

    echo -e "${GREEN}----DEPLOYING BRIDGE----${NC}"
    kleos system buyram $bbs_account $bridge_account "10.0000 EOS" -p $bbs_account@active # qs: should we do it here?
    kleos set account permission $bridge_account active --add-code # ensure bridge_account have 'eosio.code' permission
    kleos set code $bridge_account . ./BancorX.wasm -p $bridge_account@active
    kleos set contract $bridge_account . ./BancorX.wasm ./BancorX.abi -p $bridge_account@active

    echo -e "${GREEN}----INIT BRIDGE----${NC}"
    kleos push action $bridge_account init '["'$bbs_account'", "'$EOS_BRIDGE_MIN_REPORTERS'", "'$EOS_BRIDGE_MIN_LIMIT'", "'$EOS_BRIDGE_LIMIT_INC'", "'$EOS_BRIDGE_MAX_ISSUE_LIMIT'", "'$EOS_BRIDGE_MAX_DESTROY_LIMIT'"]' -p $bridge_account@active

    echo -e "${GREEN}----ADD/ENABLE REPORTING-----${NC}"
    kleos push action $bridge_account addreporter '["'$reporter_account'"]' -p $bridge_account@active
    kleos push action $bridge_account enablerpt '[true]' -p $bridge_account@active
    kleos push action $bridge_account enablext '[true]' -p $bridge_account@active
    kleos get table $bridge_account $bridge_account settings
fi
