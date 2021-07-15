#!/usr/bin/env bash
# Deploy a token if none is deployed.
. env.sh

GREEN='\033[0;32m'
NC='\033[0m'


if [ ! -f Token.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/Token
    eosio-cpp ./Token.cpp
    popd
    mv contracts_eos/contracts/eos/Token/Token.{wasm,abi} .
    rm -rf contracts_eos


    echo -e "${GREEN}-----------------------DEPLOYING BBS-----------------------${NC}"
    kleos system buyram $account $account "10.0000 EOS" -p $account@active
    kleos set account permission $account active --add-code
    kleos set code $account . ./Token.wasm -p $account@active
    kleos set contract $account . ./Token.wasm ./Token.abi -p $account@active
    echo -e "${GREEN}-----------------------CREATING BBS-----------------------${NC}"
    kleos push action $account create '[ "'$account'", "1000000000.0000 BBS"]' -p $account@active
    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $account $account
    echo -e "${GREEN}-----------------------ISSUING BBS-----------------------${NC}"
    kleos push action $account issue '[ "'$account'", "100.0000 BBS", "memo" ]' -p $account@active
    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $account $account


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
    kleos push action $bancorxaccount init '["'$bancorxaccount'", "1", "10000000000", "10000000000", "800000000000000", "400000000000000"]' -p $bancorxaccount@active
    kleos push action $bancorxaccount addreporter '["'$reporteraccount'"]' -p $bancorxaccount@active

    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $account $account    

    echo -e "${GREEN}-----------------------X TRANSFER-----------------------${NC}"
    kleos push action $account transfer '["'$account'", '"$bancorxaccount"', "10.0000 BBS", "1.1,eth,0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf,456"]' -p $account@active

    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    kleos get currency balance $account $account
fi

