#!/usr/bin/env bash
# Deploy bancorx if none is deployed.
. env.sh

CYAN='\033[1;36m'
GREEN='\033[0;32m'
NC='\033[0m'

# config - maybe move to state.env
ethereum_account='0x44569Aa35Ff6d97e6531880712a41D2af72a007C'
bancorx_min_reporters='1'
bancorx_min_limit='10000'
bancorx_limit_inc='10000'
bancorx_max_issue_limit='800000000'
bancorx_max_destroy_limit='400000000'
xtransfer_amount='1.0000 BBS'


if [ ! -f BancorX.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/BancorX
    eosio-cpp ./BancorX.cpp
    popd
    mv contracts_eos/contracts/eos/BancorX/BancorX.{wasm,abi} .
    rm -rf contracts_eos
    

    echo -e "${GREEN}-----------------------DEPLOYING BANCOR X-----------------------${NC}"
    kleos system buyram $bancorx_account $bancorx_account "10.0000 EOS" -p $bancorx_account@active
    kleos set account permission $bancorx_account active --add-code
    kleos set code $bancorx_account . ./BancorX.wasm -p $bancorx_account@active
    kleos set contract $bancorx_account . ./BancorX.wasm ./BancorX.abi -p $bancorx_account@active

    echo -e "${GREEN}-----------------------INIT BANCOR X-----------------------${NC}"
    kleos push action $bancorx_account init '["'$bbs_account'", "'$bancorx_min_reporters'", "'$bancorx_min_limit'", "'$bancorx_limit_inc'", "'$bancorx_max_issue_limit'", "'$bancorx_max_destroy_limit'"]' -p $bancorx_account@active

    echo -e "${GREEN}-----------------------ADD/ENABLE REPORTING-----------------------${NC}"
    kleos push action $bancorx_account addreporter '["'$reporter_account'"]' -p $bancorx_account@active
    kleos push action $bancorx_account enablerpt '[true]' -p $bancorx_account@active
    kleos push action $bancorx_account enablext '[true]' -p $bancorx_account@active
    kleos get table $bancorx_account $bancorx_account settings
fi

# kleos push action $bancorx_account update '["1", "10000", "10000", "800000000", "400000000"]' -p $bancorx_account@active
# kleos get table $bancorx_account $bancorx_account settings


# echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# kleos get currency balance $bbs_account $account BBS

# echo -e "${GREEN}-----------------------X TRANSFER-----------------------${NC}"
# kleos push action $bbs_account transfer '["'$account'", "'$bancorx_account'", "'$xtransfer_amount'", "1.1,ethereum,'$ethereum_account','$RANDOM'"]' -p $account@active

# echo -e "${GREEN}-----------------------BALANCE-----------------------${NC}"
# kleos get currency balance $bbs_account $account BBS