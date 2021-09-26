#!/usr/bin/env bash
# Deploy a token if none is deployed.
pushd "$(dirname "${BASH_SOURCE[0]}")"
. ../env.sh
popd

if [ ! -f Token.wasm ]; then
    git clone https://github.com/bancorprotocol/contracts_eos --branch master --single-branch --depth 1
    pushd contracts_eos/contracts/eos/Token
    eosio-cpp ./Token.cpp
    popd
    mv contracts_eos/contracts/eos/Token/Token.{wasm,abi} .
    rm -rf contracts_eos

    echo -e "${GREEN}----DEPLOYING BBS CONTRACT----${NC}"
    kleos set account permission $bbs_account active --add-code # ensure bbs_account have 'eosio.code' permission
    kleos set code $bbs_account ./Token.wasm -p $bbs_account@active
    kleos set contract $bbs_account . ./Token.wasm ./Token.abi -p $bbs_account@active
    echo -e "${GREEN}----DEPLOYING BBS CONTRACT DONE!----${NC}"

    echo -e "${GREEN}----CREATING BBS TOKEN----${NC}"
    kleos push action $bbs_account create '[ "'$bridge_account'", "'$EOS_BBS_TOKEN_MAXIMUM_SUPPLY' '$EOS_BBS_ASSET'" ]' -p $bbs_account@active
    echo -e "${GREEN}----CREATING BBS TOKEN DONE!----${NC}"
fi
