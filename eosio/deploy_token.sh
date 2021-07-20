#!/usr/bin/env bash
# Deploy a token if none is deployed.
. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'


cleos create account eosio $account EOS6cMh3ZHw5UtbUf7VWirAbwd15F5Ajxzoe79T9sesrV6UEuKY93 EOS8diddGpXpVgKT9xu1V3egRFcHJ6fccEAmQoroPagVqLsuEnoxd
# cleos create account eosio $bancorxaccount EOS787zbn2xjnJotUjauXPWoHopv1ohVCiNa4387wXLYfB2xHaRMM EOS6rv9oqZJoL5C6oTzzCt4bWQGcvnp4ycs992NcegTcvutbtmZLB
cleos create account eosio $bancorxaccount EOS6cMh3ZHw5UtbUf7VWirAbwd15F5Ajxzoe79T9sesrV6UEuKY93 EOS8diddGpXpVgKT9xu1V3egRFcHJ6fccEAmQoroPagVqLsuEnoxd
cleos create account eosio $reporteraccount EOS6KaXrPUcfCviWASwpot3Woy48P7EcFnpsRXfkbWvgZdgqXNQ9s EOS8UPQ8fk7fUa81zvVvvXq9M8sPdcXncsUUfFKiNnYgRKTVoFCqG
cleos create account eosio tomerbridge1 EOS6cMh3ZHw5UtbUf7VWirAbwd15F5Ajxzoe79T9sesrV6UEuKY93 EOS8diddGpXpVgKT9xu1V3egRFcHJ6fccEAmQoroPagVqLsuEnoxd

if [ ! -f Token.wasm ]; then
    # git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/Token
    eosio-cpp ./Token.cpp
    popd
    mv contracts_eos/contracts/eos/Token/Token.{wasm,abi} .
    # rm -rf contracts_eos


    echo -e "${GREEN}-----------------------DEPLOYING BBS-----------------------${NC}"
    cleos set account permission $account active --add-code
    cleos set code $account . ./Token.wasm -p $account@active
    cleos set contract $account . ./Token.wasm ./Token.abi -p $account@active
    echo -e "${GREEN}-----------------------CREATING BBS-----------------------${NC}"
    cleos push action $account create '[ "'$bancorxaccount'", "1000000.0000 BBS"]' -p $account@active
    
    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    cleos get currency balance $account $bancorxaccount
    echo -e "${GREEN}-----------------------ISSUING BBS-----------------------${NC}"
    cleos push action $account issue '[ "'$bancorxaccount'", "100.0000 BBS", "memo" ]' -p $bancorxaccount@active
    echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
    cleos get currency balance $account $bancorxaccount


    # TODO: bbs token account should give issue and retire permission to bancorx account
    # cleos set account permission $bancorxaccount issuer '{ "threshold": 1, "keys": [{ "key": "EOS8HuvjfQeUS7tMdHPPrkTFMnEP7nr6oivvuJyNcvW9Sx5MxJSkZ", "weight": 1 }], "accounts": [{ "permission": { "actor":"bbsbbsbbsbbs","permission":"eosio.code" }, "weight":1 }] }' owner -p bbsbbsbbsbbs
fi


if [ ! -f BancorX.wasm ]; then
    # git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/BancorX
    eosio-cpp ./BancorX.cpp
    popd
    mv contracts_eos/contracts/eos/BancorX/BancorX.{wasm,abi} .
    # rm -rf contracts_eos
    

    echo -e "${GREEN}-----------------------DEPLOYING BANCOR X-----------------------${NC}"
    cleos set account permission $bancorxaccount active --add-code
    cleos set code $bancorxaccount . ./BancorX.wasm -p $bancorxaccount@active
    cleos set contract $bancorxaccount . ./BancorX.wasm ./BancorX.abi -p $bancorxaccount@active

    echo -e "${GREEN}-----------------------INIT BANCOR X-----------------------${NC}"
    cleos push action $bancorxaccount init '["'$account'", "1", "10000", "10000", "800000000", "400000000"]' -p $bancorxaccount@active

    echo -e "${GREEN}-----------------------ADD/ENABLE REPORTING-----------------------${NC}"
    cleos push action $bancorxaccount addreporter '["'$reporteraccount'"]' -p $bancorxaccount@active
    cleos get table $bancorxaccount $bancorxaccount settings
    cleos push action $bancorxaccount enablerpt '[true]' -p $bancorxaccount@active
    cleos get table $bancorxaccount $bancorxaccount settings
fi


# echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# cleos get currency balance $account tomerbridge1 BBS

# echo -e "${GREEN}-----------------------X TRANSFER-----------------------${NC}"
# cleos push action $bancorxaccount enablext '[true]' -p $bancorxaccount@active
# cleos push action $account transfer '["tomerbridge1", '"$bancorxaccount"', "2.0000 BBS", "1.1,ethereum,0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf,456"]' -p tomerbridge1@active

# echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# cleos get currency balance $account tomerbridge1 BBS












# if [ ! -f Token.wasm ]; then
#     git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
#     pushd contracts_eos/contracts/eos/Token
#     eosio-cpp ./Token.cpp
#     popd
#     mv contracts_eos/contracts/eos/Token/Token.{wasm,abi} .
#     rm -rf contracts_eos

#     echo -e "${GREEN}-----------------------DEPLOYING BBS-----------------------${NC}"
#     kleos system buyram $account $account "10.0000 EOS" -p $account@active
#     kleos set account permission $account active --add-code
#     kleos set code $account . ./Token.wasm -p $account@active
#     kleos set contract $account . ./Token.wasm ./Token.abi -p $account@active
#     echo -e "${GREEN}-----------------------CREATING BBS-----------------------${NC}"
#     kleos push action $account create '[ "'$bancorxaccount'", "1000000.0000 BBS"]' -p $account@active
    
#     echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
#     kleos get currency balance $account $bancorxaccount
#     echo -e "${GREEN}-----------------------ISSUING BBS-----------------------${NC}"
#     kleos push action $account issue '[ "'$bancorxaccount'", "100.0000 BBS", "memo" ]' -p $bancorxaccount@active
#     echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
#     kleos get currency balance $account $bancorxaccount


#     # TODO: bbs token account should give issue and retire permission to bancorx account
#     # kleos set account permission $bancorxaccount issuer '{ "threshold": 1, "keys": [{ "key": "EOS8HuvjfQeUS7tMdHPPrkTFMnEP7nr6oivvuJyNcvW9Sx5MxJSkZ", "weight": 1 }], "accounts": [{ "permission": { "actor":"bbsbbsbbsbbs","permission":"eosio.code" }, "weight":1 }] }' owner -p bbsbbsbbsbbs
# fi


# if [ ! -f BancorX.wasm ]; then
#     git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
#     pushd contracts_eos/contracts/eos/BancorX
#     eosio-cpp ./BancorX.cpp
#     popd
#     mv contracts_eos/contracts/eos/BancorX/BancorX.{wasm,abi} .
#     rm -rf contracts_eos
    

#     echo -e "${GREEN}-----------------------DEPLOYING BANCOR X-----------------------${NC}"
#     kleos system buyram $bancorxaccount $bancorxaccount "10.0000 EOS" -p $bancorxaccount@active
#     kleos set account permission $bancorxaccount active --add-code
#     kleos set code $bancorxaccount . ./BancorX.wasm -p $bancorxaccount@active
#     kleos set contract $bancorxaccount . ./BancorX.wasm ./BancorX.abi -p $bancorxaccount@active

#     echo -e "${GREEN}-----------------------INIT BANCOR X-----------------------${NC}"
#     kleos push action $bancorxaccount init '["'$account'", "1", "10000", "10000", "800000000", "400000000"]' -p $bancorxaccount@active

#     echo -e "${GREEN}-----------------------ADD/ENABLE REPORTING-----------------------${NC}"
#     kleos push action $bancorxaccount addreporter '["'$reporteraccount'"]' -p $bancorxaccount@active
#     kleos get table $bancorxaccount $bancorxaccount settings
#     kleos push action $bancorxaccount enablerpt '[true]' -p $bancorxaccount@active
#     kleos get table $bancorxaccount $bancorxaccount settings
# fi


# # echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# # kleos get currency balance $account tomerbridge1 BBS

# # echo -e "${GREEN}-----------------------X TRANSFER-----------------------${NC}"
# # kleos push action $account transfer '["'$account'", '"$bancorxaccount"', "2.0000 BBS", "1.1,ethereum,0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf,456"]' -p $account@active

# # echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# # kleos get currency balance $account tomerbridge1 BBS

