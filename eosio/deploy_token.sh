#!/usr/bin/env bash
# Deploy a token if none is deployed.
. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'


# bbs_token_maximum_supply='1000000.0000 BBS'
# bbs_token_issue_amount='100.0000 BBS'


if [ ! -f Token.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/Token
    eosio-cpp ./Token.cpp
    popd
    mv contracts_eos/contracts/eos/Token/Token.{wasm,abi} .
    rm -rf contracts_eos

    echo -e "${GREEN}-----------------------DEPLOYING BBS-----------------------${NC}"
    kleos system buyram $bbs_account $bbs_account "10.0000 EOS" -p $bbs_account@active
    kleos set account permission $bbs_account active --add-code
    kleos set code $bbs_account . ./Token.wasm -p $bbs_account@active
    kleos set contract $bbs_account . ./Token.wasm ./Token.abi -p $bbs_account@active

    echo -e "${GREEN}-----------------------CREATING BBS-----------------------${NC}"
    kleos push action $bbs_account create '[ "'$bridge_account'", "'$EOS_BBS_TOKEN_MAXIMUM_SUPPLY'"]' -p $bbs_account@active

    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $bbs_account $bridge_account

    echo -e "${GREEN}-----------------------ISSUING BBS-----------------------${NC}"
    kleos push action $bbs_account issue '[ "'$bridge_account'", "'$EOS_BBS_TOKEN_ISSUE_AMOUNT'", "memo" ]' -p $bridge_account@active

    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $bbs_account $bridge_account


    # TODO: bbs token account should give issue and retire permission to bridge account
    # kleos set account permission $bridge_account issuer '{ "threshold": 1, "keys": [{ "key": "EOS8HuvjfQeUS7tMdHPPrkTFMnEP7nr6oivvuJyNcvW9Sx5MxJSkZ", "weight": 1 }], "accounts": [{ "permission": { "actor":"bbsbbsbbsbbs","permission":"eosio.code" }, "weight":1 }] }' owner -p bbsbbsbbsbbs
fi
