#!/usr/bin/env bash
# Deploy a token if none is deployed.
. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'

ethereumAccount='0x44569Aa35Ff6d97e6531880712a41D2af72a007C'


# kylin:
# 1. create bbs token account (curl http://faucet-kylin.blockzone.net/create/$account) -> save to state.env
# 2. fund it (curl http://faucet-kylin.blockzone.net/get_token/$account)
# 3. kleos wallet import --private-key "owner_private_key"
# 4. kleos wallet import --private-key "active_private_key"
# 5. kleos system newaccount $account $bancorxaccount "active_public_key" --stake-cpu "10 EOS" --stake-net "5 EOS" --buy-ram-kbytes 5000 --transfer
# 6. save bancor x account to state.env
# 7. create reporter account



if [ ! -f Token.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/Token
    eosio-cpp ./Token.cpp
    popd
    mv contracts_eos/contracts/eos/Token/Token.{wasm,abi} .
    rm -rf contracts_eos

    echo -e "${GREEN}-----------------------DEPLOYING BBS-----------------------${NC}"
    kleos system buyram $bbsaccount $bbsaccount "10.0000 EOS" -p $bbsaccount@active
    kleos set account permission $bbsaccount active --add-code
    kleos set code $bbsaccount . ./Token.wasm -p $bbsaccount@active
    kleos set contract $bbsaccount . ./Token.wasm ./Token.abi -p $bbsaccount@active

    echo -e "${GREEN}-----------------------CREATING BBS-----------------------${NC}"
    kleos push action $bbsaccount create '[ "'$bancorxaccount'", "1000000.0000 BBS"]' -p $bbsaccount@active
    
    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $bbsaccount $bancorxaccount

    echo -e "${GREEN}-----------------------ISSUING BBS-----------------------${NC}"
    kleos push action $bbsaccount issue '[ "'$bancorxaccount'", "100.0000 BBS", "memo" ]' -p $bancorxaccount@active

    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $bbsaccount $bancorxaccount


    # TODO: bbs token account should give issue and retire permission to bancorx account
    # kleos set account permission $bancorxaccount issuer '{ "threshold": 1, "keys": [{ "key": "EOS8HuvjfQeUS7tMdHPPrkTFMnEP7nr6oivvuJyNcvW9Sx5MxJSkZ", "weight": 1 }], "accounts": [{ "permission": { "actor":"bbsbbsbbsbbs","permission":"eosio.code" }, "weight":1 }] }' owner -p bbsbbsbbsbbs
fi


if [ ! -f BancorX.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/BancorX
    eosio-cpp ./BancorX.cpp
    popd
    mv contracts_eos/contracts/eos/BancorX/BancorX.{wasm,abi} .
    rm -rf contracts_eos
    

    echo -e "${GREEN}-----------------------DEPLOYING BANCOR X-----------------------${NC}"
    kleos system buyram $bancorxaccount $bancorxaccount "10.0000 EOS" -p $bancorxaccount@active
    kleos set account permission $bancorxaccount active --add-code
    kleos set code $bancorxaccount . ./BancorX.wasm -p $bancorxaccount@active
    kleos set contract $bancorxaccount . ./BancorX.wasm ./BancorX.abi -p $bancorxaccount@active

    echo -e "${GREEN}-----------------------INIT BANCOR X-----------------------${NC}"
    kleos push action $bancorxaccount init '["'$bbsaccount'", "1", "10000", "10000", "800000000", "400000000"]' -p $bancorxaccount@active

    echo -e "${GREEN}-----------------------ADD/ENABLE REPORTING-----------------------${NC}"
    kleos push action $bancorxaccount addreporter '["'$reporteraccount'"]' -p $bancorxaccount@active
    kleos push action $bancorxaccount enablerpt '[true]' -p $bancorxaccount@active
    kleos push action $bancorxaccount enablext '[true]' -p $bancorxaccount@active
    kleos get table $bancorxaccount $bancorxaccount settings
fi

# kleos push action $bancorxaccount update '["1", "10000", "10000", "800000000", "400000000"]' -p $bancorxaccount@active
# kleos get table $bancorxaccount $bancorxaccount settings


echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
kleos get currency balance $bbsaccount $account BBS

echo -e "${GREEN}-----------------------X TRANSFER-----------------------${NC}"
kleos push action $bbsaccount transfer '["'$account'", "'$bancorxaccount'", "1.0000 BBS", "1.1,ethereum,'$ethereumAccount','$RANDOM'"]' -p $account@active

echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
kleos get currency balance $bbsaccount $account BBS

